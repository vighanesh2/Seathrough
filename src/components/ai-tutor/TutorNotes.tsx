"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  HelpCircle,
  Lightbulb,
  NotebookPen,
  Pencil,
  X,
} from "lucide-react";
import { TutorMathText } from "@/components/ai-tutor/TutorMathText";
import {
  clearDraftNotes,
  emptyNotes,
  loadNotes,
  makeBlock,
  noteFingerprint,
  saveNotes,
  type NoteBlock,
  type NoteKind,
  type NotesDoc,
} from "@/lib/ai-tutor/sessionNotes";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  NoteKind,
  { label: string; Icon: typeof Lightbulb; tone: string }
> = {
  heading: {
    label: "Topic",
    Icon: Bookmark,
    tone: "bg-[#eef3f8] text-ink",
  },
  idea: {
    label: "Idea",
    Icon: Lightbulb,
    tone: "bg-[#e8f1fa] text-ink",
  },
  prompt: {
    label: "Question",
    Icon: HelpCircle,
    tone: "bg-[#f4efe6] text-ink",
  },
  you: {
    label: "You wrote",
    Icon: Pencil,
    tone: "bg-white text-ink",
  },
  insight: {
    label: "Keep this",
    Icon: Bookmark,
    tone: "bg-[#e6f4ee] text-ink",
  },
};

function hasBlock(doc: NotesDoc, kind: NoteKind, text: string) {
  const mark = noteFingerprint(kind, text);
  return doc.blocks.some((block) => noteFingerprint(block.kind, block.text) === mark);
}

export function useTutorNotes(sessionId?: string) {
  const [doc, setDoc] = useState<NotesDoc>(() => emptyNotes());
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const openRef = useRef(false);
  const persistTimer = useRef<number>(0);
  const docRef = useRef(doc);

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  useEffect(() => {
    openRef.current = open;
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    const stored = loadNotes(sessionId);
    if (stored) {
      setDoc(
        sessionId && stored.sessionId === "draft"
          ? { ...stored, sessionId }
          : stored,
      );
      return;
    }
    setDoc(emptyNotes(sessionId || "draft"));
    setUnread(0);
  }, [sessionId]);

  const persist = useCallback((next: NotesDoc, immediate = false) => {
    docRef.current = next;
    setDoc(next);
    window.clearTimeout(persistTimer.current);
    const write = () => {
      saveNotes(next);
      setSavedAt(Date.now());
    };
    if (immediate) {
      write();
      return;
    }
    persistTimer.current = window.setTimeout(write, 280);
  }, []);

  const capture = useCallback(
    (kind: NoteKind, text: string) => {
      const cleaned = text.trim();
      if (!cleaned) return false;
      const current = docRef.current;
      if (hasBlock(current, kind, cleaned)) return false;
      const next: NotesDoc = {
        ...current,
        blocks: [...current.blocks, makeBlock(kind, cleaned)],
        updatedAt: Date.now(),
      };
      persist(next, true);
      if (!openRef.current) setUnread((count) => count + 1);
      return true;
    },
    [persist],
  );

  const setTitle = useCallback(
    (title: string) => {
      persist({ ...docRef.current, title });
    },
    [persist],
  );

  const setJournal = useCallback(
    (journal: string) => {
      persist({ ...docRef.current, journal });
    },
    [persist],
  );

  const updateBlock = useCallback(
    (id: string, text: string) => {
      const current = docRef.current;
      persist({
        ...current,
        blocks: current.blocks.map((block) =>
          block.id === id ? { ...block, text } : block,
        ),
      });
    },
    [persist],
  );

  const bindSession = useCallback(
    (id: string, title: string) => {
      const current = docRef.current;
      const next: NotesDoc = {
        ...current,
        sessionId: id,
        title: title.trim() || current.title,
      };
      persist(next, true);
      clearDraftNotes();
    },
    [persist],
  );

  const resetNotes = useCallback(() => {
    clearDraftNotes();
    const fresh = emptyNotes();
    docRef.current = fresh;
    setDoc(fresh);
    setUnread(0);
    setOpen(false);
    setSavedAt(null);
  }, []);

  return {
    doc,
    open,
    setOpen,
    unread,
    savedAt,
    capture,
    setTitle,
    setJournal,
    updateBlock,
    bindSession,
    resetNotes,
  };
}

function NoteCallout({
  block,
  onChange,
}: {
  block: NoteBlock;
  onChange: (text: string) => void;
}) {
  const meta = KIND_META[block.kind];
  const Icon = meta.Icon;
  return (
    <div
      className={cn(
        "group relative rounded-[4px] px-3 py-2.5",
        meta.tone,
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-[12px] text-muted">
        <Icon className="size-3.5" />
        <span>{meta.label}</span>
      </div>
      {block.source === "you" ? (
        <textarea
          value={block.text}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-[1.6em] w-full resize-none bg-transparent text-[16px] leading-7 text-ink outline-none"
          rows={Math.min(8, Math.max(2, block.text.split("\n").length))}
        />
      ) : (
        <TutorMathText
          as="p"
          className="text-[16px] leading-7 text-ink"
          text={block.text}
        />
      )}
    </div>
  );
}

export function TutorNotes({
  notes,
  visible,
}: {
  notes: ReturnType<typeof useTutorNotes>;
  visible: boolean;
}) {
  const {
    doc,
    open,
    setOpen,
    unread,
    savedAt,
    setTitle,
    setJournal,
    updateBlock,
  } = notes;
  const titleRef = useRef<HTMLInputElement>(null);
  const badge = unread > 9 ? "9+" : String(unread);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => titleRef.current?.focus(), 40);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [open, setOpen]);

  if (!visible && !open) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed right-5 bottom-5 z-40 flex size-14 items-center justify-center rounded-full border border-board-edge bg-white text-ink shadow-[0_12px_28px_rgba(26,43,60,0.16)] outline-none",
          "hover:border-accent/50 hover:bg-accent-soft",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        )}
        aria-label={unread > 0 ? `Notes, ${unread} new` : "Open notebook"}
      >
        <NotebookPen className="size-5" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-copper px-1 text-[11px] font-semibold text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex justify-center overflow-y-auto bg-[#5c6b7a]/35 px-3 py-6 sm:px-6 sm:py-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutor-notebook-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <article className="relative my-auto w-full max-w-[760px] rounded-[2px] bg-[#f7f4ec] shadow-[0_24px_80px_rgba(26,43,60,0.28)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-[repeating-linear-gradient(90deg,#e4d8c4_0px,#e4d8c4_1px,transparent_1px,transparent_8px)]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-6 left-[22px] w-[2px] rounded-full bg-[#c45e1a]/55"
            />

            <header className="relative flex items-center justify-between gap-3 border-b border-[#e6ddd0] py-3 pr-4 pl-16 sm:pl-20">
              <p className="truncate text-[13px] text-muted">Notebook</p>
              <div className="flex items-center gap-3">
                <p className="text-[12px] text-muted">
                  {savedAt ? "Saved" : "Saving…"}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex size-8 items-center justify-center rounded-md text-muted outline-none hover:bg-[#efe8dc] hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label="Close notebook"
                >
                  <X className="size-4" />
                </button>
              </div>
            </header>

            <div
              className="relative py-10 pr-8 pl-16 sm:pr-16 sm:pl-20"
              style={{
                backgroundImage:
                  "linear-gradient(to bottom, transparent 31px, #eadfcf 32px)",
                backgroundSize: "100% 32px",
              }}
            >
              <div className="relative">
                <p className="text-[40px] leading-none">📒</p>
                <label htmlFor="tutor-notes-title" className="sr-only">
                  Page title
                </label>
                <input
                  id="tutor-notes-title"
                  ref={titleRef}
                  value={doc.title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Untitled"
                  className="mt-4 w-full bg-transparent font-[family-name:var(--font-newsreader)] text-[2.4rem] leading-[1.15] tracking-tight text-ink outline-none placeholder:text-[#b3a894]"
                />
                <p id="tutor-notebook-title" className="sr-only">
                  {doc.title || "Untitled"}
                </p>

                <div className="mt-8 space-y-2">
                  {doc.blocks.map((block) => (
                    <NoteCallout
                      key={block.id}
                      block={block}
                      onChange={(text) => updateBlock(block.id, text)}
                    />
                  ))}
                </div>

                <label htmlFor="tutor-notes-journal" className="sr-only">
                  Write on this page
                </label>
                <textarea
                  id="tutor-notes-journal"
                  value={doc.journal}
                  onChange={(event) => setJournal(event.target.value)}
                  placeholder="Type something…"
                  className="mt-3 min-h-[280px] w-full resize-none bg-transparent text-[17px] leading-8 text-ink outline-none placeholder:text-[#b3a894]"
                />
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </>
  );
}
