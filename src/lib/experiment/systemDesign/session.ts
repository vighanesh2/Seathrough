import { parseIntakeAnswers } from "@/lib/experiment/systemDesign/answers";
import type { IntakeAnswers } from "@/lib/experiment/systemDesign/sections";
import {
  MAX_EDIT_HISTORY,
  designGaps,
  parseSystemDesignSpec,
  type SystemDesignSpec,
} from "@/lib/experiment/systemDesign/spec";

/** One line of the conversation shown in the script, placed after the beat it followed. */
export type DesignMessage = {
  id: string;
  role: "user" | "tutor";
  text: string;
  /** Index of the beat this message follows; -1 puts it before the first beat. */
  afterBeat: number;
  /** A change the student asked for that could not be made. */
  failed?: boolean;
};

export type SavedDesignSession = {
  version: 1;
  prompt: string;
  answers: IntakeAnswers;
  spec: SystemDesignSpec;
  edits: string[];
  messages: DesignMessage[];
};

export type SavedDesignSummary = {
  id: string;
  title: string;
  question: string;
  createdAt: string;
  updatedAt: string;
  preview?: string;
  local?: boolean;
};

export const MAX_SAVED_MESSAGES = 200;
const MAX_MESSAGE_TEXT = 1200;
const MAX_PROMPT = 800;
const MAX_EDIT = 500;
/** A small JPEG of the architecture sheet; anything larger is dropped rather than rejected. */
export const MAX_PREVIEW_CHARS = 400_000;

function readMessages(raw: unknown): DesignMessage[] {
  if (!Array.isArray(raw)) return [];
  const messages: DesignMessage[] = [];
  for (const item of raw.slice(-MAX_SAVED_MESSAGES)) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const role = obj.role === "user" || obj.role === "tutor" ? obj.role : null;
    const text = typeof obj.text === "string" ? obj.text.trim().slice(0, MAX_MESSAGE_TEXT) : "";
    if (!role || !text) continue;
    const afterBeat =
      typeof obj.afterBeat === "number" && Number.isInteger(obj.afterBeat)
        ? Math.max(-1, Math.min(obj.afterBeat, 500))
        : -1;
    messages.push({
      id: typeof obj.id === "string" && obj.id ? obj.id.slice(0, 64) : crypto.randomUUID(),
      role,
      text,
      afterBeat,
      ...(obj.failed === true ? { failed: true } : {}),
    });
  }
  return messages;
}

/** Validates a session sent by the browser or read back from storage. */
export function parseSavedDesignSession(
  raw: unknown,
): { ok: true; session: SavedDesignSession } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Nothing to save." };
  const obj = raw as Record<string, unknown>;
  const prompt = typeof obj.prompt === "string" ? obj.prompt.trim() : "";
  if (!prompt || prompt.length > MAX_PROMPT) {
    return { ok: false, error: "This design has no question to save." };
  }
  const answers = parseIntakeAnswers(obj.answers);
  if (!answers.ok) return { ok: false, error: "This design is missing its answers." };
  const spec = parseSystemDesignSpec(obj.spec);
  if (spec.boxes.length < 2 || designGaps(spec).length) {
    return { ok: false, error: "This design is incomplete, so it cannot be saved." };
  }
  const edits = Array.isArray(obj.edits)
    ? obj.edits
        .filter((edit): edit is string => typeof edit === "string" && Boolean(edit.trim()))
        .map((edit) => edit.trim().slice(0, MAX_EDIT))
        .slice(-MAX_EDIT_HISTORY)
    : [];
  return {
    ok: true,
    session: {
      version: 1,
      prompt,
      answers: answers.answers,
      spec,
      edits,
      messages: readMessages(obj.messages),
    },
  };
}

export function readPreview(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  if (!raw.startsWith("data:image/jpeg;base64,") || raw.length > MAX_PREVIEW_CHARS) return undefined;
  return raw;
}

export function sessionTitle(session: SavedDesignSession): string {
  return (session.spec.title || session.prompt).replace(/\s+/g, " ").trim().slice(0, 80) || "System design";
}
