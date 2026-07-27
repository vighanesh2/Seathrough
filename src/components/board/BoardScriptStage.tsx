"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { BoardScript, BoardScriptStep } from "@/lib/schemas/boardScript";
import { revealThroughStepIndex } from "@/lib/visuals/library/scriptReveal";

type BoardScriptStageProps = {
  script: BoardScript;
  playKey: number;
  /** Current lesson beat order — board reveals to match narration */
  beatOrder: number;
  totalBeats?: number;
  onDrawComplete?: () => void;
};

type Line =
  | {
      kind: "write";
      id: string;
      text: string;
      style: "plain" | "equation" | "emphasis";
      boxed?: boolean;
      crossed?: boolean;
    }
  | { kind: "arrow"; id: string; label?: string }
  | { kind: "note"; id: string; text: string };

/**
 * Progressive pen board synced to lesson beats (not a free-running dump).
 */
export function BoardScriptStage({
  script,
  playKey,
  beatOrder,
  totalBeats,
  onDrawComplete,
}: BoardScriptStageProps) {
  const onDoneRef = useRef(onDrawComplete);
  onDoneRef.current = onDrawComplete;

  const steps = useMemo(() => script.steps ?? [], [script]);
  const targetThrough = revealThroughStepIndex({
    steps,
    beatOrder: Math.max(beatOrder, 1),
    totalBeats,
  });

  const [visibleCount, setVisibleCount] = useState(0);
  const [boxedIds, setBoxedIds] = useState<Set<string>>(() => new Set());
  const [crossedIds, setCrossedIds] = useState<Set<string>>(() => new Set());
  const [newestId, setNewestId] = useState<string | undefined>();
  const visibleRef = useRef(0);

  // New script → reset
  useEffect(() => {
    visibleRef.current = 0;
    setVisibleCount(0);
    setBoxedIds(new Set());
    setCrossedIds(new Set());
    setNewestId(undefined);
  }, [playKey, script]);

  // Reveal toward the beat target
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = () => {
      if (cancelled) return;

      if (visibleRef.current >= targetThrough) {
        onDoneRef.current?.();
        return;
      }

      const next = visibleRef.current + 1;
      visibleRef.current = next;
      const step = steps[next - 1];
      applyModifiers(step, steps, next - 1, setBoxedIds, setCrossedIds);
      setNewestId(lineIdForStep(step, next - 1));
      setVisibleCount(next);

      const delay =
        step?.type === "pause" ? (step.ms ?? 280) : step ? dwellMs(step) : 200;
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, 50);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [targetThrough, steps, playKey]);

  const lines = materializeLines(steps, visibleCount, boxedIds, crossedIds);

  return (
    <div
      className="flex w-full max-w-[560px] flex-col items-center justify-center"
      role="img"
      aria-label={script.title ?? "Teacher board script"}
    >
      {script.misconception ? (
        <p className="mb-3 max-w-[480px] rounded-lg bg-warn-soft px-3 py-2 font-sans text-xs font-medium text-warn">
          Watch for: {script.misconception}
        </p>
      ) : null}

      <div className="relative w-full max-w-[520px] rounded-2xl border border-dashed border-accent/35 bg-chalk/80 px-5 py-6">
        <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:repeating-linear-gradient(0deg,transparent,transparent_27px,rgba(27,108,168,0.07)_28px)]" />

        <ul className="relative z-[1] flex flex-col gap-3.5">
          {lines.map((line) => (
            <li
              key={line.id}
              className={line.id === newestId ? "animate-sketch-in" : undefined}
              style={
                line.id === newestId ? { animationDuration: "420ms" } : undefined
              }
            >
              {line.kind === "write" ? (
                <WriteLine line={line} />
              ) : line.kind === "arrow" ? (
                <ArrowLine label={line.label} />
              ) : (
                <p className="font-sans text-sm text-marker-soft">{line.text}</p>
              )}
            </li>
          ))}
        </ul>

        {lines.length === 0 ? (
          <p className="relative z-[1] font-sans text-sm text-muted">
            Waiting for this step…
          </p>
        ) : null}
      </div>

      {script.title ? (
        <p className="mt-3 text-center font-sans text-xs text-muted">
          {script.title}
        </p>
      ) : null}
    </div>
  );
}

function applyModifiers(
  step: BoardScriptStep | undefined,
  steps: BoardScriptStep[],
  atIndex: number,
  setBoxedIds: Dispatch<SetStateAction<Set<string>>>,
  setCrossedIds: Dispatch<SetStateAction<Set<string>>>,
) {
  if (!step) return;
  if (step.type === "box") {
    const target = resolveTarget(step, steps, atIndex);
    if (target) setBoxedIds((prev) => new Set(prev).add(target));
  }
  if (step.type === "cross_out") {
    const target = resolveTarget(step, steps, atIndex);
    if (target) setCrossedIds((prev) => new Set(prev).add(target));
  }
}

function lineIdForStep(
  step: BoardScriptStep | undefined,
  index: number,
): string | undefined {
  if (!step) return undefined;
  if (step.type === "write") return step.id ?? `w${index}`;
  if (step.type === "arrow") return step.id ?? `a${index}`;
  if (step.type === "note") return step.id ?? `n${index}`;
  if (step.type === "box" && step.text) return step.id ?? `bx${index}`;
  return undefined;
}

function WriteLine({
  line,
}: {
  line: Extract<Line, { kind: "write" }>;
}) {
  const size =
    line.style === "emphasis"
      ? "text-2xl font-semibold"
      : line.style === "equation"
        ? "text-xl font-medium tracking-wide"
        : "text-base";

  const color =
    line.style === "emphasis"
      ? "text-accent-deep"
      : line.style === "equation"
        ? "text-marker"
        : "text-ink";

  return (
    <div
      className={`relative inline-block max-w-full px-2 py-1 font-mono ${size} ${color} ${
        line.boxed
          ? "rounded-lg border-2 border-success bg-success-soft/50"
          : ""
      } ${line.crossed ? "opacity-70" : ""}`}
    >
      <span
        className={
          line.crossed ? "line-through decoration-error decoration-2" : ""
        }
      >
        {line.text}
      </span>
      {!line.boxed && line.style !== "plain" ? (
        <span
          aria-hidden
          className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full bg-accent/45"
        />
      ) : null}
    </div>
  );
}

function ArrowLine({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 pl-1 font-sans text-sm text-accent">
      <span aria-hidden className="text-lg leading-none">
        ↓
      </span>
      {label ? (
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-marker-soft">
          {label}
        </span>
      ) : null}
    </div>
  );
}

function materializeLines(
  steps: BoardScriptStep[],
  visibleCount: number,
  boxedIds: Set<string>,
  crossedIds: Set<string>,
): Line[] {
  const lines: Line[] = [];

  for (let i = 0; i < Math.min(visibleCount, steps.length); i++) {
    const step = steps[i];
    if (step.type === "write") {
      const id = step.id ?? `w${i}`;
      lines.push({
        kind: "write",
        id,
        text: step.text,
        style: step.style ?? "plain",
        boxed: boxedIds.has(id),
        crossed: crossedIds.has(id),
      });
    } else if (step.type === "arrow") {
      lines.push({
        kind: "arrow",
        id: step.id ?? `a${i}`,
        label: step.label,
      });
    } else if (step.type === "note") {
      lines.push({
        kind: "note",
        id: step.id ?? `n${i}`,
        text: step.text,
      });
    } else if (step.type === "box" && step.text) {
      const id = step.id ?? `bx${i}`;
      lines.push({
        kind: "write",
        id,
        text: step.text,
        style: "emphasis",
        boxed: true,
      });
    }
  }

  return lines.map((line) => {
    if (line.kind !== "write") return line;
    return {
      ...line,
      boxed: line.boxed || boxedIds.has(line.id),
      crossed: line.crossed || crossedIds.has(line.id),
    };
  });
}

function resolveTarget(
  step: Extract<BoardScriptStep, { type: "box" | "cross_out" }>,
  steps: BoardScriptStep[],
  atIndex: number,
): string | undefined {
  if (step.targetId) return step.targetId;
  for (let j = atIndex - 1; j >= 0; j--) {
    const prev = steps[j];
    if (prev.type === "write") return prev.id ?? `w${j}`;
  }
  return undefined;
}

function dwellMs(step: BoardScriptStep): number {
  if (step.type === "write") {
    if (step.style === "emphasis") return 520;
    if (step.style === "equation") return 480;
    return 380;
  }
  if (step.type === "note") return 420;
  if (step.type === "arrow") return 280;
  if (step.type === "box" || step.type === "cross_out") return 320;
  return 240;
}
