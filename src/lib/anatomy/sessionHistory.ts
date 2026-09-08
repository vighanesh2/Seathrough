import type {
  AnatomyAnimationMode,
  AnatomyAnswer,
  AnatomySceneId,
  AnatomyStructureId,
} from "@/lib/anatomy/types";
import type { ConversationListItem } from "@/lib/conversations/types";

export type AnatomySessionTurn = {
  id: string;
  question: string;
  answer?: AnatomyAnswer;
  error?: string;
  createdAt: string;
};

export type AnatomySession = {
  id: string;
  title: string;
  sceneId: AnatomySceneId;
  mode: AnatomyAnimationMode;
  reveal: number;
  selected: AnatomyStructureId | null;
  focused: AnatomyStructureId[];
  turns: AnatomySessionTurn[];
  createdAt: string;
  updatedAt: string;
};

const MAX_SESSIONS = 40;

function storageKey(userId?: string | null): string {
  return userId
    ? `ve.anatomySessions.${userId}`
    : "ve.anatomySessions.anon";
}

function isSceneId(value: unknown): value is AnatomySceneId {
  return (
    value === "eye" ||
    value === "cardiopulmonary" ||
    value === "brain" ||
    value === "kidney"
  );
}

function sanitizeSession(raw: unknown): AnatomySession | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || !s.id) return null;
  if (!isSceneId(s.sceneId)) return null;
  if (!Array.isArray(s.turns)) return null;

  const turns: AnatomySessionTurn[] = [];
  for (const item of s.turns) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    if (typeof t.id !== "string" || typeof t.question !== "string") continue;
    turns.push({
      id: t.id,
      question: t.question,
      answer: t.answer as AnatomyAnswer | undefined,
      error: typeof t.error === "string" ? t.error : undefined,
      createdAt:
        typeof t.createdAt === "string" ? t.createdAt : new Date().toISOString(),
    });
  }

  const title =
    typeof s.title === "string" && s.title.trim()
      ? s.title.trim().slice(0, 80)
      : turns[0]?.question.slice(0, 80) || "3D exploration";

  return {
    id: s.id,
    title,
    sceneId: s.sceneId,
    mode: (typeof s.mode === "string" ? s.mode : "overview") as AnatomyAnimationMode,
    reveal:
      typeof s.reveal === "number" && s.reveal >= 1 && s.reveal <= 6
        ? s.reveal
        : 6,
    selected: (typeof s.selected === "string" ? s.selected : null) as
      | AnatomyStructureId
      | null,
    focused: Array.isArray(s.focused)
      ? (s.focused.filter((x) => typeof x === "string") as AnatomyStructureId[])
      : [],
    turns,
    createdAt:
      typeof s.createdAt === "string" ? s.createdAt : new Date().toISOString(),
    updatedAt:
      typeof s.updatedAt === "string" ? s.updatedAt : new Date().toISOString(),
  };
}

export function readAnatomySessions(
  userId?: string | null,
): AnatomySession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeSession)
      .filter((s): s is AnatomySession => Boolean(s))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_SESSIONS);
  } catch {
    return [];
  }
}

export function writeAnatomySessions(
  sessions: AnatomySession[],
  userId?: string | null,
): void {
  if (typeof window === "undefined") return;
  try {
    const cleaned = sessions
      .map(sanitizeSession)
      .filter((s): s is AnatomySession => Boolean(s))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_SESSIONS);
    localStorage.setItem(storageKey(userId), JSON.stringify(cleaned));
  } catch {
    // quota / private mode
  }
}

/** Merge local/remote snapshots, keeping the most complete newest session per id. */
export function mergeAnatomySessions(
  local: AnatomySession[],
  remote: AnatomySession[],
): AnatomySession[] {
  const merged = new Map<string, AnatomySession>();
  for (const session of [...local, ...remote]) {
    const current = merged.get(session.id);
    if (
      !current ||
      session.turns.length > current.turns.length ||
      (session.turns.length === current.turns.length &&
        session.updatedAt > current.updatedAt)
    ) {
      merged.set(session.id, session);
    }
  }
  return [...merged.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_SESSIONS);
}

export function upsertAnatomySession(
  session: AnatomySession,
  userId?: string | null,
): AnatomySession[] {
  const existing = readAnatomySessions(userId).filter((s) => s.id !== session.id);
  const next = [session, ...existing];
  writeAnatomySessions(next, userId);
  return next;
}

export function getAnatomySession(
  id: string,
  userId?: string | null,
): AnatomySession | null {
  return readAnatomySessions(userId).find((s) => s.id === id) ?? null;
}

export function anatomySessionsToListItems(
  sessions: AnatomySession[],
): ConversationListItem[] {
  return sessions.map((s) => ({
    id: s.id,
    title: s.title,
    rootPrompt: s.turns[0]?.question || s.title,
    updatedAt: s.updatedAt,
    preview:
      s.turns.find((t) => t.answer)?.answer?.answer?.slice(0, 100) ||
      s.turns[0]?.question ||
      SCENE_LABEL[s.sceneId],
  }));
}

const SCENE_LABEL: Record<AnatomySceneId, string> = {
  eye: "Eye exploration",
  cardiopulmonary: "Heart & lungs",
  brain: "Brain exploration",
  kidney: "Kidney exploration",
};

export function migrateAnonAnatomySessions(userId: string): AnatomySession[] {
  if (!userId) return readAnatomySessions(userId);
  const anon = readAnatomySessions(null);
  const mine = readAnatomySessions(userId);
  if (!anon.length) return mine;
  const ids = new Set(mine.map((s) => s.id));
  const merged = [
    ...mine,
    ...anon.filter((s) => !ids.has(s.id)),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  writeAnatomySessions(merged, userId);
  try {
    localStorage.removeItem(storageKey(null));
  } catch {
    // ignore
  }
  return merged;
}

export function newAnatomySessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `anat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function titleFromQuestion(question: string, sceneId: AnatomySceneId): string {
  const trimmed = question.trim().replace(/\s+/g, " ");
  if (trimmed.length >= 8) return trimmed.slice(0, 72);
  return SCENE_LABEL[sceneId];
}
