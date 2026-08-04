import { routeVisual, visualStableKey } from "@/lib/visuals/router";
import { classifyVisualPlan } from "@/lib/visuals/library/classify";
import { isWeakVisualPlan } from "@/lib/visuals/library/boardScriptPlan";
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
 * Decide generate / keep / retire from prompt-relevant routing.
 * Uses stable visual identity (ignores formula) so equation strips can be patched
 * without tearing down the board.
 */
export function decideVisual(input: VisualTriggerInput): VisualTriggerResult {
  const beat = input.beat;
  const routed = routeVisual({
    prompt: input.prompt,
    conceptKey: beat.conceptKey,
    plan: beat.visual,
  });

  const key = visualStableKey(routed);

  if (!input.hasVisual) {
    return {
      action: "generate",
      plan: routed,
      reason: `first:${routed.renderer}:${routed.assetId ?? routed.sceneRecipe?.kind ?? "plain"}`,
    };
  }

  if (beat.imageAction === "retire") {
    // Blanking mid-lesson drops equations/pen scripts — keep the teaching board
    return {
      action: "keep",
      plan: null,
      reason: "skip-retire-keep-board",
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
    // Same figure — allow a formula patch through without treating it as a new board
    if (routed.formula?.trim()) {
      return {
        action: "generate",
        plan: routed,
        reason: `formula-patch:${routed.renderer}`,
      };
    }
    return { action: "keep", plan: null, reason: "same-visual" };
  }

  const quality = classifyVisualPlan(routed);
  if (quality === "generic" || isWeakVisualPlan(routed)) {
    return {
      action: "keep",
      plan: null,
      reason: "keep-over-weak-reroute",
    };
  }

  return {
    action: "generate",
    plan: routed,
    reason: `route:${routed.renderer}:${routed.assetId ?? routed.source ?? routed.sceneRecipe?.kind ?? "plain"}`,
  };
}
