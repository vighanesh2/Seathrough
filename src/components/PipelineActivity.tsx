"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Minus,
  TriangleAlert,
} from "lucide-react";
import type {
  PipelineStage,
  PipelineStatusEvent,
} from "@/types/lesson";
import { cn } from "@/lib/utils";

export type PipelineRecords = Partial<
  Record<PipelineStage, PipelineStatusEvent>
>;

const STAGE_ORDER: PipelineStage[] = [
  "research",
  "lesson_plan",
  "visuals",
  "narration",
  "audio",
  "persistence",
];

const LABELS: Record<PipelineStage, string> = {
  research: "Researching sources",
  lesson_plan: "Planning the lesson",
  visuals: "Generating the visual",
  narration: "Preparing narration",
  audio: "Generating audio",
  persistence: "Saving the lesson",
};

export function pipelineStatusLabel(
  event: PipelineStatusEvent | undefined,
): string {
  if (!event) return "Preparing your lesson";
  const base = LABELS[event.stage];
  const beat =
    event.scope?.beatOrder && event.scope.totalBeats
      ? ` · ${event.scope.beatOrder} of ${event.scope.totalBeats}`
      : "";
  if (event.state === "started") return `${base}${beat}`;
  if (event.state === "failed") return `${base} used a fallback`;
  if (event.state === "skipped") return `${base} skipped`;
  return `${base} complete${beat}`;
}

export function latestPipelineEvent(
  records: PipelineRecords,
): PipelineStatusEvent | undefined {
  const active = STAGE_ORDER.map((stage) => records[stage]).findLast(
    (event) => event?.state === "started",
  );
  return active ?? STAGE_ORDER.map((stage) => records[stage]).findLast(Boolean);
}

export function PipelineActivity({
  records,
  expanded,
  onToggle,
}: {
  records: PipelineRecords;
  expanded: boolean;
  onToggle: () => void;
}) {
  const events = STAGE_ORDER.map((stage) => records[stage]).filter(
    (event): event is PipelineStatusEvent => Boolean(event),
  );
  const latest = latestPipelineEvent(records);
  if (!events.length) return null;

  return (
    <div
      className="flex min-w-0 items-center gap-2"
      role="status"
      aria-live="polite"
    >
      <StageIcon event={latest} />
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#3d5166]">
        {pipelineStatusLabel(latest)}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[#60758a] hover:bg-[#eef4f9]"
        aria-label={expanded ? "Collapse generation activity" : "Show generation activity"}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
      </button>
      {expanded ? (
        <div className="hidden items-center gap-1.5 border-l border-[#d7e3eb] pl-2 md:flex">
          {events.map((event) => (
            <div
              key={event.stage}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium",
                event.state === "failed"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : event.state === "skipped"
                    ? "border-slate-200 bg-slate-50 text-slate-500"
                    : "border-[#d7e3eb] bg-white text-[#3d5166]",
              )}
              title={pipelineStatusLabel(event)}
            >
              <StageIcon event={event} />
              <span>{shortLabel(event.stage)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function shortLabel(stage: PipelineStage): string {
  switch (stage) {
    case "lesson_plan":
      return "Plan";
    case "persistence":
      return "Save";
    default:
      return stage.charAt(0).toUpperCase() + stage.slice(1);
  }
}

function StageIcon({ event }: { event?: PipelineStatusEvent }) {
  if (!event || event.state === "started") {
    return (
      <LoaderCircle className="size-3.5 shrink-0 animate-spin text-[#287fb5]" />
    );
  }
  if (event.state === "failed") {
    return <TriangleAlert className="size-3.5 shrink-0 text-amber-600" />;
  }
  if (event.state === "skipped") {
    return <Minus className="size-3.5 shrink-0 text-slate-400" />;
  }
  return <Check className="size-3.5 shrink-0 text-emerald-600" />;
}
