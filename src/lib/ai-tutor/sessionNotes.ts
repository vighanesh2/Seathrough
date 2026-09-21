export type NoteKind = "heading" | "idea" | "prompt" | "you" | "insight";

export type NoteBlock = {
  id: string;
  kind: NoteKind;
  text: string;
  source: "auto" | "you";
  createdAt: number;
};

export type NotesDoc = {
  sessionId: string;
  title: string;
  blocks: NoteBlock[];
  journal: string;
  updatedAt: number;
};

const PREFIX = "seethrough.tutor-notes.";
const DRAFT_KEY = `${PREFIX}draft`;

function keyFor(sessionId: string) {
  return `${PREFIX}${sessionId}`;
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyNotes(sessionId = "draft", title = "Lesson notes"): NotesDoc {
  return {
    sessionId,
    title,
    blocks: [],
    journal: "",
    updatedAt: Date.now(),
  };
}

export function noteFingerprint(kind: NoteKind, text: string) {
  return `${kind}:${text.trim().replace(/\s+/g, " ").slice(0, 240)}`;
}

export function loadNotes(sessionId?: string): NotesDoc | null {
  if (typeof window === "undefined") return null;
  const key = sessionId ? keyFor(sessionId) : DRAFT_KEY;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return sessionId ? loadNotes() : null;
    const parsed = JSON.parse(raw) as NotesDoc;
    if (!parsed || !Array.isArray(parsed.blocks)) return null;
    return {
      sessionId: parsed.sessionId || sessionId || "draft",
      title: parsed.title || "Lesson notes",
      blocks: parsed.blocks,
      journal: parsed.journal || "",
      updatedAt: parsed.updatedAt || Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveNotes(doc: NotesDoc) {
  if (typeof window === "undefined") return;
  const next = { ...doc, updatedAt: Date.now() };
  const key = next.sessionId && next.sessionId !== "draft" ? keyFor(next.sessionId) : DRAFT_KEY;
  window.localStorage.setItem(key, JSON.stringify(next, null, 2));
}

export function clearDraftNotes() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
}

export function makeBlock(
  kind: NoteKind,
  text: string,
  source: "auto" | "you" = "auto",
): NoteBlock {
  return {
    id: newId(),
    kind,
    text: text.trim(),
    source,
    createdAt: Date.now(),
  };
}
