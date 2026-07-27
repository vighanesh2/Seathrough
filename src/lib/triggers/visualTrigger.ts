import { routeVisual, visualKey } from "@/lib/visuals/router";
import type { VisualPlan } from "@/lib/visuals/types";
import type { LessonBeatParsed } from "@/lib/schemas/lesson";
import type { DiagramAction } from "@/types/lesson";

export type VisualTriggerInput = {
  prompt: string;
  beat: LessonBeatParsed;
  activeVisualKey?: string;
  /** Already drew opening visual this lesson */
  hasVisual: boolean;
};

export type VisualTriggerResult = {
  action: DiagramAction;
  plan: VisualPlan | null;
  reason: string;
};

/**
 * Clean visual trigger for the current stack:
 * - Decide generate / keep / none from prompt-relevant routing
 * - Never keep a mismatched metaphor from narration
 */
export function decideVisual(input: VisualTriggerInput): VisualTriggerResult {
  const beat = input.beat;
  const routed = routeVisual({
    prompt: input.prompt,
    conceptKey: beat.conceptKey,
    // Intentionally omit narration so metaphors in speech can't hijack the board
    plan: beat.visual,
  });

  const key = visualKey(routed);

  // Always put something on the board for the first visual slot
  if (!input.hasVisual) {
    return {
      action: "generate",
      plan: routed,
      reason: `first:${routed.renderer}:${routed.assetId ?? routed.sceneRecipe?.kind ?? "plain"}`,
    };
  }

  const wantsNew =
    beat.imageAction === "generate" ||
    beat.kind === "visual_shift" ||
    Boolean(beat.visual);

  if (!wantsNew) {
    return { action: "keep", plan: null, reason: "beat-keep" };
  }

  if (input.activeVisualKey && input.activeVisualKey === key) {
    return { action: "keep", plan: null, reason: "same-visual" };
  }

  if (beat.imageAction === "retire") {
    return {
      action: "retire",
      plan: {
        renderer: "rough",
        sceneRecipe: { kind: "concept", label: "cleared", note: "board cleared" },
        actions: [{ type: "clear" }],
      },
      reason: "retire",
    };
  }

  return {
    action: "generate",
    plan: routed,
    reason: `route:${routed.renderer}:${routed.assetId ?? routed.source ?? routed.sceneRecipe?.kind ?? "plain"}`,
  };
}
