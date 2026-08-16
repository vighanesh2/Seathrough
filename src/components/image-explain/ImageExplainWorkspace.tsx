"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import type { BoardNarrationLine } from "@/components/board/BoardNarration";
import { AppHeader } from "@/components/lms/AppHeader";
import { AppShell } from "@/components/lms/AppShell";
import { VisualStage } from "@/components/VisualStage";
import { Button } from "@/components/ui/button";
import { PenCueTracker } from "@/lib/board/penCues";
import { consumeLessonStream } from "@/lib/client/consumeLessonStream";
import type { DrawCommand } from "@/lib/draw-engine/commands";
import { DrawCommandQueue } from "@/lib/draw-engine/resolve";
import { toUserFacingError } from "@/lib/errors/userFacing";
import type {
  ImageExtraction,
  ImageExtractEngine,
} from "@/lib/image-explain/types";
import { ALLOWED_IMAGE_MIME, MAX_IMAGE_BYTES } from "@/lib/image-explain/types";
import { visualStableKey } from "@/lib/visuals/router";
import type { VisualPlan } from "@/lib/visuals/types";
import type { StreamEvent } from "@/types/lesson";

type Preference = "auto" | "vision" | "ocr";
type Phase = "idle" | "extracting" | "teaching" | "done" | "error";

export function ImageExplainWorkspace() {
  const { user, accessToken, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [preference, setPreference] = useState<Preference>("auto");
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ImageExtraction | null>(null);

  const [title, setTitle] = useState<string | undefined>();
  const [visualPlan, setVisualPlan] = useState<VisualPlan | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [beatOrder, setBeatOrder] = useState(1);
  const [totalBeats, setTotalBeats] = useState<number | undefined>();
  const [boardNarration, setBoardNarration] = useState<BoardNarrationLine[]>(
    [],
  );
  const [preferDrawEngine, setPreferDrawEngine] = useState(false);
  const [drawPlaying, setDrawPlaying] = useState(false);
  const [drawSessionKey, setDrawSessionKey] = useState(0);
  const [drawSpeech, setDrawSpeech] = useState<string | null>(null);
  const [boardCanvasHeight, setBoardCanvasHeight] = useState(600);
  const [boardScrollToY, setBoardScrollToY] = useState<number | null>(null);

  const drawQueue = useMemo(() => new DrawCommandQueue(), []);
  const narrationSeqRef = useRef(0);
  const lastVisualKeyRef = useRef("");
  const drawClockRef = useRef(0);
  const boardBottomYRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const penCues = useMemo(
    () => new PenCueTracker({ clock: () => drawClockRef.current }),
    [],
  );

  useEffect(
    () => () => {
      abortRef.current?.abort();
      audioRef.current?.pause();
      penCues.stopWaiting();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl, penCues],
  );

  function acceptFile(next: File | null) {
    setError(null);
    setExtraction(null);
    setPhase("idle");
    resetBoard();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFile(null);
    if (!next) return;

    const mime = (next.type || "").toLowerCase();
    if (
      !(ALLOWED_IMAGE_MIME as readonly string[]).includes(mime) &&
      mime !== "image/jpg"
    ) {
      setError("Unsupported image type. Use PNG, JPEG, WebP, or GIF.");
      return;
    }
    if (next.size > MAX_IMAGE_BYTES) {
      setError("Image must be 4MB or smaller.");
      return;
    }
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  }

  function resetBoard() {
    drawQueue.clear();
    audioRef.current?.pause();
    audioRef.current = null;
    penCues.reset();
    setDrawSessionKey((k) => k + 1);
    drawClockRef.current = 0;
    boardBottomYRef.current = 0;
    setBoardCanvasHeight(600);
    setBoardScrollToY(null);
    setPreferDrawEngine(false);
    setDrawPlaying(false);
    setDrawSpeech(null);
    setVisualPlan(null);
    setPlayKey((k) => k + 1);
    setBeatOrder(1);
    setTotalBeats(undefined);
    setTitle(undefined);
    setBoardNarration([]);
    narrationSeqRef.current = 0;
    lastVisualKeyRef.current = "";
  }

  function pushNarration(
    text: string,
    kind: BoardNarrationLine["kind"] = "narration",
  ) {
    narrationSeqRef.current += 1;
    const id = `n-${narrationSeqRef.current}`;
    setBoardNarration((prev) => [...prev, { id, text, kind }]);
  }

  async function playAudio(mimeType: string, base64: string) {
    const audio = new Audio(`data:${mimeType};base64,${base64}`);
    audioRef.current = audio;
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      void audio.play().catch(() => resolve());
    });
  }

  async function handleStreamEvent(event: StreamEvent) {
    switch (event.type) {
      case "student_message":
        pushNarration(event.text, "student");
        break;
      case "plan_meta":
        setTitle(event.title);
        if (typeof event.beatCount === "number") setTotalBeats(event.beatCount);
        break;
      case "beat_start":
        setBeatOrder(event.beat.order);
        break;
      case "visual": {
        const stable = visualStableKey(event.plan);
        if (stable && stable === lastVisualKeyRef.current) {
          setVisualPlan((prev) => {
            if (!prev) return event.plan;
            const formula = prev.formula?.trim()
              ? prev.formula
              : event.plan.formula;
            if (formula === prev.formula) return prev;
            return { ...prev, formula };
          });
          break;
        }
        lastVisualKeyRef.current = stable;
        setVisualPlan(event.plan);
        setPlayKey((k) => k + 1);
        break;
      }
      case "draw_session":
        if (event.reset !== false) {
          drawQueue.clear();
          penCues.reset();
          setDrawSessionKey((k) => k + 1);
          drawClockRef.current = 0;
          boardBottomYRef.current = 0;
        }
        if (event.canvas?.height) {
          setBoardCanvasHeight((h) => Math.max(h, event.canvas.height));
        }
        if (typeof event.scrollToY === "number") {
          setBoardScrollToY(event.scrollToY);
        }
        setPreferDrawEngine(true);
        setDrawPlaying(true);
        setDrawSpeech(null);
        break;
      case "draw_cmd":
        setPreferDrawEngine(true);
        setDrawPlaying(true);
        drawQueue.enqueue(
          rebaseDrawCommand(event.command, drawQueue, drawClockRef.current),
        );
        boardBottomYRef.current = Math.max(
          boardBottomYRef.current,
          commandBottomY(event.command),
        );
        setBoardCanvasHeight((h) =>
          Math.max(h, boardBottomYRef.current + 80),
        );
        break;
      case "draw_cmds": {
        setPreferDrawEngine(true);
        setDrawPlaying(true);
        const rebased = rebaseDrawCommands(
          event.commands,
          drawQueue,
          drawClockRef.current,
        );
        if (event.beatId) {
          penCues.registerBeat(event.beatId, event.commands, rebased);
        }
        drawQueue.enqueue(rebased);
        boardBottomYRef.current = Math.max(
          boardBottomYRef.current,
          commandsBottomY(event.commands),
        );
        setBoardCanvasHeight((h) =>
          Math.max(h, boardBottomYRef.current + 80),
        );
        break;
      }
      case "draw_speak":
        setDrawSpeech(event.text);
        break;
      case "audio": {
        const cue = penCues.cueFor(event.beatId, event.cueT0);
        if (cue != null) await penCues.waitForPen(cue);
        if (event.text) setDrawSpeech(event.text);
        await playAudio(event.mimeType, event.base64);
        break;
      }
      case "narration":
        pushNarration(
          event.text.startsWith("[voice unavailable")
            ? event.text
            : event.text,
          event.text.startsWith("[voice unavailable") ? "error" : "narration",
        );
        break;
      case "human_summary":
        pushNarration(event.text, "summary");
        break;
      case "error":
        setError(toUserFacingError(event.message));
        setPhase("error");
        break;
      case "done":
        setPhase("done");
        setDrawPlaying(false);
        break;
      default:
        break;
    }
  }

  async function runExplain() {
    if (!file) {
      setError("Drop or choose a screenshot first.");
      return;
    }
    if (!user || !accessToken) {
      setAuthOpen(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setExtraction(null);
    resetBoard();
    setPhase("extracting");

    try {
      const body = new FormData();
      body.set("image", file);
      if (question.trim()) body.set("question", question.trim());
      body.set("preference", preference);

      const res = await fetch("/api/image-explain", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body,
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        extraction?: ImageExtraction;
        lessonPrompt?: string;
        error?: string;
      };
      if (!res.ok || !data.extraction || !data.lessonPrompt) {
        setError(data.error ?? "Could not read this screenshot.");
        setPhase("error");
        return;
      }

      setExtraction(data.extraction);
      setTitle(data.extraction.title);
      setPhase("teaching");

      await consumeLessonStream({
        prompt: data.lessonPrompt,
        withAudio: true,
        signal: controller.signal,
        mode: "new",
        accessToken,
        onEvent: handleStreamEvent,
      });

      if (!controller.signal.aborted) {
        setPhase((p) => (p === "error" ? p : "done"));
        setDrawPlaying(false);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Network error while explaining the image.");
      setPhase("error");
    }
  }

  function engineLabel(engine: ImageExtractEngine): string {
    return engine === "vision" ? "Vision model" : "Tesseract OCR";
  }

  const busy = phase === "extracting" || phase === "teaching";

  return (
    <AppShell className="flex-col">
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode="login"
      />

      <AppHeader
        current="screenshot-explain"
        eyebrow="From a photo"
        title={title ?? "Drop homework — we’ll teach it on the board"}
        account={
          !authLoading && !user ? (
            <Button variant="outline" size="sm" onClick={() => setAuthOpen(true)}>
              Sign in
            </Button>
          ) : null
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="flex min-h-0 flex-col gap-3 p-4 md:p-6">
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              acceptFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`flex shrink-0 flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed px-4 py-3 transition ${
              dragging
                ? "border-accent bg-accent-soft/40"
                : "border-board-edge bg-white/80"
            }`}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Upload preview"
                className="h-20 w-28 rounded-lg border border-board-edge object-cover"
              />
            ) : (
              <div className="grid h-20 w-28 place-items-center rounded-lg border border-dashed border-board-edge bg-paper font-sans text-[11px] text-muted">
                Drop image
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-sans text-sm font-semibold">
                {file ? file.name : "Drag & drop a screenshot, or choose a file"}
              </p>
              <p className="font-sans text-xs text-muted">
                PNG / JPEG / WebP / GIF · max 4MB · taught on the same whiteboard
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-lg border border-board-edge bg-white px-3 py-1.5 font-sans text-xs font-semibold text-accent-deep hover:border-accent"
                >
                  {file ? "Replace" : "Choose image"}
                </button>
                {file ? (
                  <button
                    type="button"
                    onClick={() => acceptFile(null)}
                    className="rounded-lg border border-board-edge bg-paper px-3 py-1.5 font-sans text-xs text-muted"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-board-edge bg-white/85 shadow-(--shadow-shell)">
            <div className="flex items-center justify-between border-b border-board-edge px-4 py-2">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                Whiteboard
              </p>
              <p className="font-sans text-xs text-muted">
                {phase === "extracting"
                  ? "Reading screenshot…"
                  : phase === "teaching"
                    ? "Teaching on the board…"
                    : phase === "done"
                      ? "Done"
                      : "Waiting for a screenshot"}
              </p>
            </div>
            <div className="h-[min(70vh,640px)] min-h-90">
              <VisualStage
                plan={visualPlan}
                playKey={playKey}
                title={title}
                beatOrder={beatOrder}
                totalBeats={totalBeats}
                narrationLines={boardNarration}
                streaming={phase === "teaching"}
                drawQueue={drawQueue}
                drawSessionKey={drawSessionKey}
                drawPlaying={drawPlaying}
                preferDrawEngine={preferDrawEngine}
                drawSpeech={drawSpeech}
                canvasHeight={boardCanvasHeight}
                scrollToY={boardScrollToY}
                onDrawClock={(ms) => {
                  drawClockRef.current = ms;
                }}
              />
            </div>
          </div>
        </main>

        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-board-edge bg-white/75 p-4 lg:border-l lg:border-t-0 lg:p-5">
          <button
            type="button"
            disabled={busy || !file}
            onClick={() => void runExplain()}
            className="w-full rounded-xl bg-accent px-4 py-2.5 font-sans text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-50"
          >
            {phase === "extracting"
              ? "Reading photo…"
              : phase === "teaching"
                ? "Teaching…"
                : "Explain on the board"}
          </button>
          {error ? (
            <p className="font-sans text-xs text-warn">{error}</p>
          ) : null}

          <div>
            <label
              htmlFor="image-question"
              className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-accent"
            >
              Anything to focus on? (optional)
            </label>
            <textarea
              id="image-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="e.g. Solve for x"
              className="mt-2 w-full resize-y rounded-xl border border-board-edge bg-paper px-3 py-2 font-sans text-sm outline-none focus:border-accent"
            />
          </div>

          <details className="rounded-xl border border-board-edge bg-paper/80 px-3 py-2">
            <summary className="cursor-pointer font-sans text-xs font-medium text-muted">
              Advanced · how we read the photo
            </summary>
            <div className="mt-2 flex flex-wrap gap-1 rounded-lg border border-board-edge bg-white p-0.5">
              {(
                [
                  ["auto", "Auto"],
                  ["vision", "Vision"],
                  ["ocr", "OCR"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPreference(id)}
                  className={`rounded-md px-2.5 py-1.5 font-sans text-[11px] font-semibold transition ${
                    preference === id
                      ? "bg-accent-soft text-accent-deep"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 font-sans text-[11px] leading-snug text-muted">
              Leave on Auto for homework. Use OCR only for plain text.
            </p>
          </details>

          {extraction ? (
            <div className="rounded-xl border border-board-edge bg-paper p-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md bg-accent-soft px-2 py-0.5 font-sans text-[11px] font-semibold text-accent-deep">
                  {extraction.kind}
                </span>
                <span className="rounded-md border border-board-edge px-2 py-0.5 font-sans text-[11px] text-muted">
                  {engineLabel(extraction.engine)}
                </span>
              </div>
              <p className="mt-2 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                What we read
              </p>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink">
                {extraction.text}
              </pre>
            </div>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}

function rebaseDrawCommands(
  commands: DrawCommand[],
  queue: DrawCommandQueue,
  clockMs: number,
): DrawCommand[] {
  if (!commands.length) return commands;
  const existing = queue.getAll();
  const prevEnd = existing.reduce(
    (m, c) => Math.max(m, c.t0 + (c.durationMs || 0)),
    0,
  );
  const minT = Math.min(...commands.map((c) => c.t0));
  const base = Math.max(clockMs + 80, prevEnd + 120);
  return commands.map((c) => ({
    ...c,
    t0: base + (c.t0 - minT),
  }));
}

function rebaseDrawCommand(
  command: DrawCommand,
  queue: DrawCommandQueue,
  clockMs: number,
): DrawCommand {
  return rebaseDrawCommands([command], queue, clockMs)[0]!;
}

function commandBottomY(cmd: DrawCommand): number {
  switch (cmd.type) {
    case "text":
      return cmd.y + (cmd.fontSize ?? 18) * 1.6;
    case "rect":
    case "highlight":
    case "image":
      return cmd.y + cmd.h;
    case "circle":
      return cmd.y + cmd.radius;
    case "line":
    case "arrow":
      return Math.max(cmd.y1, cmd.y2);
    case "stroke":
      return Math.max(...cmd.points.map((p) => p.y), 0);
    default:
      return 0;
  }
}

function commandsBottomY(commands: DrawCommand[]): number {
  let max = 0;
  for (const c of commands) {
    max = Math.max(max, commandBottomY(c));
  }
  return max;
}
