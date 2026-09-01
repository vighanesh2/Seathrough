"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { getTopicModule, type TopicBoardParams } from "@/lib/topics";
import { cn } from "@/lib/utils";

const JsxGraphBoard = dynamic(
  () => import("@/components/topics/JsxGraphBoard").then((m) => m.JsxGraphBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(320px,42vh)] w-full items-center justify-center rounded-xl border border-board-edge bg-chalk font-sans text-sm text-muted">
        Loading graph…
      </div>
    ),
  },
);

type TopicBoardProps = {
  /** A topic library id, e.g. "mean-value-theorem". Unknown ids render nothing. */
  topicId: string;
  /** The learner's question, used to tailor the board (an interval, say). */
  prompt?: string;
  /** Explicit board settings, e.g. replayed from a saved visual plan. */
  params?: TopicBoardParams;
  showTitle?: boolean;
  showSteps?: boolean;
  /** Lesson beat (1-based) — highlights the matching explanation step on the board. */
  beatOrder?: number;
  /** Smaller graph for the infinite whiteboard; narration stays beside it. */
  compact?: boolean;
  className?: string;
  boardClassName?: string;
  onReady?: () => void;
};

/**
 * Drop-in interactive for anything in the topic library.
 *
 * Any page can render `<TopicBoard topicId="mean-value-theorem" />` — the
 * browser-only graphing engine is loaded lazily behind the scenes.
 */
export function TopicBoard({
  topicId,
  prompt,
  params,
  showTitle = true,
  showSteps = false,
  beatOrder,
  compact = false,
  className,
  boardClassName,
  onReady,
}: TopicBoardProps) {
  const topic = useMemo(() => getTopicModule(topicId), [topicId]);

  const resolvedParams = useMemo(() => {
    if (params) return params;
    if (!topic) return null;
    return prompt ? topic.deriveParams(prompt) : topic.defaultParams;
  }, [params, prompt, topic]);

  const activeStep = useMemo(() => {
    if (!topic || !beatOrder || beatOrder < 1) return null;
    return topic.steps[Math.min(beatOrder - 1, topic.steps.length - 1)] ?? null;
  }, [beatOrder, topic]);

  if (!topic || !resolvedParams) return null;

  return (
    <figure
      className={cn(
        "flex w-full flex-col",
        compact ? "max-w-[min(640px,92vw)] gap-3" : "min-h-0 gap-3",
        className,
      )}
    >
      {showTitle ? (
        <figcaption className="shrink-0">
          <h3
            className={cn(
              "font-display text-ink",
              compact ? "text-lg" : "text-lg",
            )}
          >
            {topic.title}
          </h3>
          <p className="mt-0.5 font-sans text-sm leading-5 text-muted">
            {topic.summary}
          </p>
        </figcaption>
      ) : null}

      {compact && activeStep && !showSteps ? (
        <div className="shrink-0 rounded-lg border border-board-edge/80 bg-accent-soft/25 px-3 py-2.5">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-deep">
            {activeStep.title}
          </p>
          <p className="mt-1 font-sans text-sm leading-5 text-ink-soft">
            {activeStep.detail}
          </p>
        </div>
      ) : null}

      <div className={cn(compact ? "shrink-0" : "min-h-0 flex-1")}>
        <JsxGraphBoard
          boardId={topic.boardId}
          params={resolvedParams}
          ariaLabel={`${topic.title} — interactive graph`}
          className={cn(
            compact ? "h-[min(320px,42vh)] min-h-[240px]" : "h-full min-h-[280px]",
            boardClassName,
          )}
          onReady={onReady}
        />
      </div>

      <p className="shrink-0 font-sans text-xs text-muted">
        Drag the points to reshape the curve. Shift + scroll to zoom.
      </p>

      {showSteps ? (
        <ol className="shrink-0 space-y-2 border-t border-board-edge pt-3">
          {topic.steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full font-sans text-[11px] font-semibold",
                  beatOrder === index + 1
                    ? "bg-accent text-chalk"
                    : "bg-accent-soft text-accent-deep",
                )}
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span className="font-sans text-sm font-semibold text-ink">
                  {step.title}
                </span>
                <span className="mt-0.5 block font-sans text-sm text-muted">
                  {step.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </figure>
  );
}
