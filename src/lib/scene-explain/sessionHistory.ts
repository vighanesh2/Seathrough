import type { ConversationListItem } from "@/lib/conversations/types";
import type {
  SceneAgentLine,
  SceneProgram,
} from "@/lib/scene-explain/types";

export type SceneExplainSession = {
  id: string;
  title: string;
  prompt: string;
  program: SceneProgram;
  code: string;
  reveal: number;
  logs: SceneAgentLine[];
  narration: string[];
  createdAt: string;
  updatedAt: string;
};

const MAX_SESSIONS = 24;
const MAX_CODE_CHARS = 60_000;

function storageKey(userId?: string | null): string {
  return userId
    ? `ve.sceneExplainSessions.${userId}`
    : "ve.sceneExplainSessions.anon";
}

function sanitizeSession(raw: unknown): SceneExplainSession | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || !s.id) return null;
  if (typeof s.prompt !== "string" || !s.prompt.trim()) return null;
  if (typeof s.code !== "string" || !s.code.trim()) return null;
  if (!s.program || typeof s.program !== "object") return null;

  const program = s.program as SceneProgram;
  if (typeof program.title !== "string" || !Array.isArray(program.beats)) {
    return null;
  }

  const logs = Array.isArray(s.logs)
    ? (s.logs as SceneAgentLine[]).filter(
        (l) =>
          l &&
          typeof l.id === "string" &&
          typeof l.text === "string" &&
          typeof l.kind === "string",
      )
    : [];
  const narration = Array.isArray(s.narration)
    ? s.narration.filter((n): n is string => typeof n === "string")
    : [];

  const code =
    s.code.length > MAX_CODE_CHARS ? s.code.slice(0, MAX_CODE_CHARS) : s.code;

  return {
    id: s.id,
    title:
      (typeof s.title === "string" && s.title.trim()) ||
      program.title ||
      s.prompt.trim().slice(0, 72),
    prompt: s.prompt.trim().slice(0, 400),
    program: {
      title: program.title,
      maxReveal:
        typeof program.maxReveal === "number" ? program.maxReveal : 1,
      beats: program.beats,
      code: typeof program.code === "string" ? program.code : code,
    },
    code,
    reveal:
      typeof s.reveal === "number" && s.reveal >= 1 ? s.reveal : 1,
    logs,
    narration,
    createdAt:
      typeof s.createdAt === "string" ? s.createdAt : new Date().toISOString(),
    updatedAt:
      typeof s.updatedAt === "string" ? s.updatedAt : new Date().toISOString(),
  };
}

export function readSceneExplainSessions(
  userId?: string | null,
): SceneExplainSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeSession)
      .filter((s): s is SceneExplainSession => Boolean(s))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_SESSIONS);
  } catch {
    return [];
  }
}

export function writeSceneExplainSessions(
  sessions: SceneExplainSession[],
  userId?: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    const cleaned = sessions
      .map(sanitizeSession)
      .filter((s): s is SceneExplainSession => Boolean(s))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_SESSIONS);
    localStorage.setItem(storageKey(userId), JSON.stringify(cleaned));
  } catch {
    // quota / private mode
  }
}

export function upsertSceneExplainSession(
  session: SceneExplainSession,
  userId?: string | null,
): SceneExplainSession[] {
  const existing = readSceneExplainSessions(userId).filter(
    (s) => s.id !== session.id,
  );
  const next = [session, ...existing];
  writeSceneExplainSessions(next, userId);
  return next;
}

export function getSceneExplainSession(
  id: string,
  userId?: string | null,
): SceneExplainSession | null {
  return readSceneExplainSessions(userId).find((s) => s.id === id) ?? null;
}

export function sceneExplainSessionsToListItems(
  sessions: SceneExplainSession[],
): ConversationListItem[] {
  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    rootPrompt: s.prompt,
    updatedAt: s.updatedAt,
    preview: s.narration[0] || s.prompt,
  }));
}

export function newSceneExplainSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `scene-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function migrateAnonSceneExplainSessions(
  userId: string,
): SceneExplainSession[] {
  if (!userId) return readSceneExplainSessions(userId);
  const anon = readSceneExplainSessions(null);
  const mine = readSceneExplainSessions(userId);
  if (!anon.length) return mine;
  const ids = new Set(mine.map((s) => s.id));
  const merged = [...mine, ...anon.filter((s) => !ids.has(s.id))].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  writeSceneExplainSessions(merged, userId);
  try {
    localStorage.removeItem(storageKey(null));
  } catch {
    // ignore
  }
  return merged;
}
