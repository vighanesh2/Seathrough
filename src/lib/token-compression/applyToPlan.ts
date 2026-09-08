import type { LessonPlanParsed } from "@/lib/schemas/lesson";
import type { PipeBBeatOut } from "@/lib/token-compression/pipeB";

/**
 * Apply Pipe B narrations onto an existing lesson plan.
 * Does not invent beats or change kinds — speech only.
 */
export function applyCompressedNarration(
  plan: LessonPlanParsed,
  beats: PipeBBeatOut[],
  humanSummary: string,
): LessonPlanParsed {
  const map = new Map(beats.map((b) => [b.id, b.narration.trim()]));
  return {
    ...plan,
    humanSummary: humanSummary.trim() || plan.humanSummary,
    beats: plan.beats.map((beat) => {
      const next = map.get(beat.id);
      if (!next) return beat;
      return { ...beat, narration: next };
    }),
  };
}
