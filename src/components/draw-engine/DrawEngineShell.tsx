"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import { consumeDrawStream } from "@/lib/draw-engine/consumeDrawStream";
import { DrawCommandQueue } from "@/lib/draw-engine/resolve";
import { toUserFacingError } from "@/lib/errors/userFacing";

const KonvaDrawStage = dynamic(
  () =>
    import("@/components/draw-engine/KonvaDrawStage").then(
      (m) => m.KonvaDrawStage,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-board-edge bg-chalk text-sm text-muted">
        Loading Konva stage…
      </div>
    ),
  },
);

type Status = "idle" | "streaming" | "playing" | "done" | "error";

export function DrawEngineShell() {
  const queue = useMemo(() => new DrawCommandQueue(), []);
  const abortRef = useRef<AbortController | null>(null);
  const sessionOriginRef = useRef<number | null>(null);

  const [prompt, setPrompt] = useState("photosynthesis");
  const [status, setStatus] = useState<Status>("idle");
  const [title, setTitle] = useState<string | null>(null);
  const [speech, setSpeech] = useState<string | null>(null);
  const [clockMs, setClockMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cmdCount, setCmdCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  const busy = status === "streaming" || status === "playing";

  const onClock = useCallback((ms: number) => {
    setClockMs(ms);
  }, []);

  async function runDemo() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    queue.clear();
    setError(null);
    setSpeech(null);
    setTitle(null);
    setCmdCount(0);
    setClockMs(0);
    sessionOriginRef.current = null;
    setSessionKey((k) => k + 1);
    setPlaying(true);
    setStatus("streaming");

    let sawError = false;

    try {
      await consumeDrawStream({
        prompt: prompt.trim(),
        signal: ac.signal,
        onEvent: (event) => {
          if (event.type === "session_start") {
            setTitle(event.title);
            sessionOriginRef.current = performance.now();
            setStatus("playing");
            return;
          }
          if (event.type === "cmd") {
            queue.enqueue(event.command);
            setCmdCount((n) => n + 1);
            return;
          }
          if (event.type === "cmds") {
            queue.enqueue(event.commands);
            setCmdCount((n) => n + event.commands.length);
            return;
          }
          if (event.type === "speak") {
            setSpeech(event.text);
            return;
          }
          if (event.type === "error") {
            sawError = true;
            setError(event.message);
            setStatus("error");
            setPlaying(false);
            return;
          }
          if (event.type === "done") {
            setStatus("done");
          }
        },
      });
      if (!sawError) setStatus("done");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setError(toUserFacingError(err));
      setStatus("error");
      setPlaying(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
    setPlaying(false);
    setStatus("idle");
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden">
      <header className="z-30 flex shrink-0 flex-wrap items-center gap-3 border-b border-board-edge/80 bg-chalk/90 px-4 py-3 backdrop-blur-md md:px-5">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            Draw engine · planner → Konva
          </p>
          <h1 className="truncate font-display text-xl font-semibold text-ink md:text-2xl">
            SeeThrough
          </h1>
        </div>
        <Link
          href="/automatic-drawing"
          className="rounded-xl border border-board-edge bg-chalk px-3 py-2 font-sans text-sm font-medium text-ink hover:bg-paper"
        >
          Whiteboard
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-board-edge bg-chalk px-3 py-2 font-sans text-sm font-medium text-ink hover:bg-paper"
        >
          Lessons
        </Link>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 overflow-hidden p-4 md:p-5">
        <form
          className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-stretch"
          onSubmit={(e) => {
            e.preventDefault();
            void runDemo();
          }}
        >
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={busy}
            maxLength={120}
            placeholder="Topic for the mock planner…"
            className="h-11 min-w-0 flex-1 rounded-xl border border-board-edge bg-chalk px-4 font-sans text-sm text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-3 focus:ring-accent-soft disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-11 shrink-0 rounded-xl bg-accent px-5 font-sans text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-40"
          >
            {status === "streaming"
              ? "Streaming…"
              : status === "playing"
                ? "Playing…"
                : "Run timed stream"}
          </button>
          <button
            type="button"
            onClick={stop}
            className="h-11 shrink-0 rounded-xl border border-board-edge bg-chalk px-4 font-sans text-sm font-medium text-ink hover:bg-paper"
          >
            Stop
          </button>
        </form>

        <div className="flex shrink-0 flex-wrap items-center gap-3 font-sans text-xs text-muted">
          {title ? <span className="font-medium text-ink">{title}</span> : null}
          <span>clock {(clockMs / 1000).toFixed(1)}s</span>
          <span>{cmdCount} cmds queued</span>
          <span className="uppercase tracking-wide">{status}</span>
        </div>

        {speech ? (
          <p className="shrink-0 rounded-xl border border-accent/30 bg-accent-soft/40 px-3 py-2 font-sans text-sm text-ink">
            <span className="font-semibold text-accent-deep">Speak: </span>
            {speech}
          </p>
        ) : null}

        {error ? (
          <p className="shrink-0 rounded-xl bg-warn-soft px-3 py-2 font-sans text-sm text-warn">
            {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1">
          <KonvaDrawStage
            queue={queue}
            sessionKey={sessionKey}
            playing={playing}
            onClock={onClock}
          />
        </div>

        <p className="shrink-0 font-sans text-[11px] text-muted">
          Mock SSE dribbles typed timed commands (stroke / arrow / text /
          pause). Konva + requestAnimationFrame owns interpolation and jitter.
          Next: wire real lesson planner + Deepgram word timestamps to this
          same queue.
        </p>
      </div>
    </div>
  );
}
