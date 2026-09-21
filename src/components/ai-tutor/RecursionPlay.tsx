"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { TutorVisualBeat, TutorVisualPlan } from "@/lib/ai-tutor/visualPlan";
import { cn } from "@/lib/utils";

type FrameStatus = "waiting" | "active" | "done";

type Frame = {
  key: string;
  label: string;
  status: FrameStatus;
  detail: string;
  result?: string;
};

const DEFAULT_BEATS = [
  {
    caption: "Start factorial(3). It cannot finish until it knows factorial(2).",
    highlight: "call" as const,
  },
  {
    caption: "That call opens factorial(2), which waits on factorial(1).",
    highlight: "call" as const,
  },
  {
    caption: "factorial(1) hits the base case and can return 1.",
    highlight: "base" as const,
  },
  {
    caption: "The answer 1 travels back. factorial(2) becomes 2 × 1.",
    highlight: "call" as const,
  },
  {
    caption: "That 2 travels back. factorial(3) becomes 3 × 2.",
    highlight: "call" as const,
  },
  {
    caption: "The stack is empty. factorial(3) returns 6.",
    highlight: "base" as const,
  },
] as const;

function defaultStackAt(beat: number): Frame[] {
  const rows: Array<Array<[number, FrameStatus, string, string | undefined]>> = [
    [[3, "active", "needs 3 × factorial(2)", undefined]],
    [
      [3, "waiting", "waiting on factorial(2)", undefined],
      [2, "active", "needs 2 × factorial(1)", undefined],
    ],
    [
      [3, "waiting", "waiting on factorial(2)", undefined],
      [2, "waiting", "waiting on factorial(1)", undefined],
      [1, "active", "base case → return 1", "1"],
    ],
    [
      [3, "waiting", "waiting on factorial(2)", undefined],
      [2, "active", "2 × 1 = 2", "2"],
    ],
    [[3, "active", "3 × 2 = 6", "6"]],
    [[3, "done", "returns 6", "6"]],
  ];
  const pack = rows[Math.min(beat, rows.length - 1)];
  return pack.map(([n, status, detail, result]) => ({
    key: `factorial(${n})`,
    label: `factorial(${n})`,
    status,
    detail,
    result,
  }));
}

function framesFromBeat(beat: TutorVisualBeat | undefined, fallback: Frame[]): Frame[] {
  const raw = beat?.frames;
  if (!raw?.length) return fallback;
  return raw.map((frame, index) => ({
    key: frame.id || frame.label || String(frame.n ?? index),
    label: frame.label || (frame.n != null ? `factorial(${frame.n})` : "call"),
    status: frame.status,
    detail: frame.detail,
    result:
      frame.result ||
      (frame.status === "done" || frame.detail.includes("=")
        ? frame.detail.split("= ").pop()
        : undefined),
  }));
}

function CodeCard({
  code,
  highlight,
  fn,
}: {
  code: string;
  highlight: "base" | "call";
  fn: string;
}) {
  const callRe = new RegExp(`${fn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\(`);
  return (
    <pre className="overflow-x-auto rounded-2xl border border-board-edge bg-[#f7fafc] px-4 py-3 font-mono text-[13px] leading-6 text-ink">
      <code>
        {code.split("\n").map((line, index) => {
          const isBase =
            /n === 1|n == 1|n is 1|n <= 1|n === 0|n == 0|n is 0/.test(line) ||
            (/return 1/.test(line) && !callRe.test(line));
          const isCall = callRe.test(line) && /n\s*-\s*[12]/.test(line);
          const on =
            (highlight === "base" && isBase) ||
            (highlight === "call" && isCall);
          return (
            <span
              key={index}
              className={cn(
                "block rounded-md px-1 -mx-1 transition-colors duration-500",
                on && "bg-accent-soft text-ink",
              )}
            >
              {line || " "}
            </span>
          );
        })}
      </code>
    </pre>
  );
}

export function RecursionPlay({
  code,
  plan,
  quiz = false,
}: {
  code?: string;
  plan?: TutorVisualPlan;
  quiz?: boolean;
}) {
  const beats: TutorVisualBeat[] = plan?.beats?.length
    ? plan.beats
    : DEFAULT_BEATS.map((beat) => ({ ...beat }));
  const last = Math.max(0, beats.length - 1);
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [asked, setAsked] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"idle" | "correct" | "wrong">("idle");
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const current = beats[Math.min(beat, last)] || beats[0];
  const frames = framesFromBeat(
    current,
    plan ? [] : defaultStackAt(beat),
  );
  const done = beat >= last;
  const fn = plan?.example?.fn || "factorial";
  const source = (plan?.code || code || "").trim();
  const title =
    plan?.title || plan?.example?.label
      ? `${plan?.title || `${plan?.example?.label} unfolding`}`
      : "factorial(3) unfolding";
  const highlight = current?.highlight === "base" ? "base" : "call";

  useEffect(() => {
    if (!playing || done) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => {
      setBeat((currentBeat) => Math.min(currentBeat + 1, last));
    }, reduce ? 400 : 1150);
    return () => window.clearTimeout(id);
  }, [playing, beat, done, last]);

  useEffect(() => {
    if (!done || !quiz) return;
    setPlaying(false);
    setAsked(true);
  }, [done, quiz]);

  useEffect(() => {
    if (!asked) return;
    answerRef.current?.focus();
    questionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [asked]);

  function replay() {
    setBeat(0);
    setPlaying(true);
    if (quiz) setAsked(false);
  }

  function step() {
    setPlaying(false);
    setBeat((currentBeat) => Math.min(currentBeat + 1, last));
  }

  function checkAnswer() {
    const guess = answer.trim().toLowerCase();
    if (!guess) return;
    setResult(
      guess === "24" || guess === "twenty-four" || guess === "twenty four"
        ? "correct"
        : "wrong",
    );
  }

  return (
    <div>
      <p className="text-center text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
        Watch the calls
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-newsreader)] text-center text-[2.15rem] leading-tight tracking-tight text-ink sm:text-[2.6rem]">
        {title}
      </h1>
      <p className="mx-auto mt-4 min-h-[48px] max-w-lg text-center text-[16px] leading-7 text-ink-soft">
        {current?.caption}
      </p>

      <div
        className="relative mx-auto mt-6 flex min-h-[280px] w-full max-w-md flex-col items-center justify-center"
        aria-live="polite"
      >
        {frames.map((frame, index) => (
          <div key={`${frame.key}-${index}`} className="flex w-full flex-col items-center">
            {index > 0 ? (
              <div
                aria-hidden
                className={cn(
                  "my-1 h-6 w-px bg-accent/40 motion-safe:origin-top motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-500",
                  frame.status === "done" && "bg-success/50",
                )}
              />
            ) : null}
            <div
              className={cn(
                "w-full rounded-2xl border px-4 py-3 shadow-[0_10px_28px_rgba(26,43,60,0.06)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-3 motion-safe:duration-500",
                frame.status === "waiting" &&
                  "border-board-edge bg-white/90 text-ink-soft",
                frame.status === "active" &&
                  "border-accent bg-accent-soft text-ink",
                frame.status === "done" &&
                  "border-success/30 bg-success-soft text-ink",
              )}
              style={{ width: `${100 - index * 8}%` }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-mono text-[15px] font-medium">{frame.label}</p>
                {frame.result ? (
                  <p
                    className={cn(
                      "font-mono text-[15px]",
                      frame.status === "done" && "text-success",
                    )}
                  >
                    {frame.result}
                  </p>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] leading-5">{frame.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {source ? (
        <div className="mt-6">
          <CodeCard code={source} highlight={highlight} fn={fn} />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {done ? (
          <Button type="button" onClick={replay}>
            <RotateCcw className="size-3.5" />
            Play again
          </Button>
        ) : playing ? (
          <Button type="button" variant="outline" onClick={() => setPlaying(false)}>
            <Pause className="size-3.5" />
            Pause
          </Button>
        ) : (
          <Button type="button" onClick={() => setPlaying(true)}>
            <Play className="size-3.5" />
            Play
          </Button>
        )}
        <Button type="button" variant="outline" onClick={step} disabled={done}>
          <StepForward className="size-3.5" />
          Next call
        </Button>
      </div>

      {asked ? (
        <div
          ref={questionRef}
          className="mt-10 border-t border-board-edge pt-8 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500"
        >
          {result === "correct" ? (
            <div className="rounded-2xl bg-success-soft px-5 py-8 text-center">
              <p className="font-[family-name:var(--font-newsreader)] text-[2rem] tracking-tight text-success">
                You are on track
              </p>
              <p className="mt-2 text-[16px] leading-7 text-ink-soft">
                factorial(4) is 4 × factorial(3). You watched factorial(3)
                return 6, so 4 × 6 = 24.
              </p>
            </div>
          ) : (
            <>
              <p className="text-center text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
                Your turn
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-newsreader)] text-center text-[1.85rem] leading-tight tracking-tight text-ink sm:text-[2.15rem]">
                What does factorial(4) return?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-center text-[16px] leading-7 text-ink-soft">
                Same function, one bigger number. Use what the animation just
                showed.
              </p>

              {result === "wrong" ? (
                <p className="mt-4 text-center text-sm text-error" role="alert">
                  Use the call you just watched: 4 × factorial(3).
                </p>
              ) : null}

              <form
                className="mt-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  checkAnswer();
                }}
              >
                <div className="rounded-2xl border border-board-edge bg-white/95 p-2 shadow-[0_18px_40px_rgba(26,43,60,0.07)]">
                  <label htmlFor="tutor-mockup-answer" className="sr-only">
                    Your answer
                  </label>
                  <Textarea
                    id="tutor-mockup-answer"
                    ref={answerRef}
                    value={answer}
                    onChange={(event) => {
                      setAnswer(event.target.value);
                      if (result === "wrong") setResult("idle");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        checkAnswer();
                      }
                    }}
                    placeholder="Type the number…"
                    className="min-h-[72px] resize-none border-0 bg-transparent px-3 py-3 text-[16px] shadow-none focus-visible:ring-0"
                  />
                  <div className="flex items-center justify-end px-2 pb-1">
                    <Button type="submit" size="sm" disabled={!answer.trim()}>
                      Send
                      <ArrowUp className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
