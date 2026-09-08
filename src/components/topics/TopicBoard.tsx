"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import {
  activeTopicStepIndex,
  revealedTopicSteps,
} from "@/lib/topics/topicLesson";
import { resolveTopicPresentation } from "@/lib/topics/presentation";
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
  topicId: string;
  prompt?: string;
  params?: TopicBoardParams;
  showTitle?: boolean;
  showSteps?: boolean;
  beatOrder?: number;
  graphFirst?: boolean;
  compact?: boolean;
  className?: string;
  boardClassName?: string;
  onReady?: () => void;
};

export function TopicBoard({
  topicId,
  prompt,
  params,
  showTitle = true,
  showSteps = false,
  beatOrder = 1,
  graphFirst = true,
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

  const presentation = useMemo(() => {
    if (!topic || !resolvedParams) return null;
    return resolveTopicPresentation(topic, resolvedParams, prompt);
  }, [topic, resolvedParams, prompt]);

  const stepCount = presentation?.steps.length ?? 0;

  const revealedCount = useMemo(() => {
    if (!presentation) return 0;
    if (showSteps) return stepCount;
    if (!graphFirst) return Math.min(beatOrder, stepCount);
    return revealedTopicSteps(beatOrder, stepCount);
  }, [beatOrder, graphFirst, presentation, showSteps, stepCount]);

  const activeIndex = useMemo(
    () => activeTopicStepIndex(beatOrder, stepCount),
    [beatOrder, stepCount],
  );

  if (!topic || !resolvedParams || !presentation) return null;

  const interactionHint =
    topic.boardId === "ode-solution"
      ? "Drag (t₀, y₀) or move the c and N sliders. Shift + scroll to zoom."
      : topic.boardId === "function-graph"
        ? "Drag P along the curve. Shift + scroll to zoom."
        : topic.boardId === "construction"
          ? "Drag the free points. Shift + scroll to zoom."
          : "Drag the points to reshape the curve. Shift + scroll to zoom.";

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
          <h3 className="font-display text-lg text-ink">{presentation.title}</h3>
          <p className="mt-0.5 font-sans text-sm leading-5 text-muted">
            {presentation.summary}
          </p>
        </figcaption>
      ) : null}

      <div className={cn(compact ? "shrink-0" : "min-h-0 flex-1")}>
        <JsxGraphBoard
          boardId={topic.boardId}
          params={resolvedParams}
          ariaLabel={`${presentation.title} — interactive graph`}
          className={cn(
            compact ? "h-[min(320px,42vh)] min-h-[240px]" : "h-full min-h-[280px]",
            boardClassName,
          )}
          onReady={onReady}
        />
      </div>

      <p className="shrink-0 font-sans text-xs text-muted">{interactionHint}</p>

      {revealedCount > 0 ? (
        <ol className="shrink-0 space-y-2 border-t border-board-edge pt-3">
          {presentation.steps.slice(0, revealedCount).map((step, index) => {
            const isActive = index === activeIndex;
            const isDone = index < activeIndex;
            return (
              <li
                key={`${step.title}-${index}`}
                className={cn(
                  "flex gap-3 rounded-lg px-2 py-2 transition-colors",
                  isActive && "bg-accent-soft/40",
                  isDone && "opacity-80",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full font-sans text-[11px] font-semibold",
                    isActive
                      ? "bg-accent text-chalk"
                      : isDone
                        ? "bg-success-soft text-success"
                        : "bg-accent-soft text-accent-deep",
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="font-sans text-sm font-semibold text-ink">
                    {step.title}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block font-sans text-sm leading-5",
                      isActive ? "text-ink-soft" : "text-muted",
                    )}
                  >
                    {step.detail}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      ) : compact && graphFirst && beatOrder <= 1 ? (
        <p className="shrink-0 font-sans text-sm italic text-muted">
          The walkthrough steps will appear here as the tutor explains.
        </p>
      ) : null}
    </figure>
  );
}
