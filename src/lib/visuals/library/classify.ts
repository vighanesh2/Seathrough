import type { VisualPlan } from "@/lib/visuals/types";
import { isWeakVisualPlan } from "@/lib/visuals/library/boardScriptPlan";

export type VisualRouteQuality = "curated" | "procedural" | "generic";

/**
 * Classify a routed plan so we know whether to grow the library.
 * - curated: hardcoded template / metaphor / strong math figure
 * - procedural: board scripts, Rough geometry / structure
 * - generic: weak concept card — upgrade to board_script
 */
export function classifyVisualPlan(plan: VisualPlan): VisualRouteQuality {
  if (plan.renderer === "template" && plan.assetId) {
    return "curated";
  }
  if (plan.renderer === "mermaid" && plan.source?.trim()) {
    return "curated";
  }
  if (plan.renderer === "mafs") {
    return "curated";
  }
  if (
    plan.renderer === "board_script" &&
    (plan.boardScript?.steps?.length ?? 0) >= 2
  ) {
    return "procedural";
  }
  if (plan.renderer === "katex" && plan.source?.trim()) {
    return "procedural";
  }

  if (isWeakVisualPlan(plan)) {
    return "generic";
  }

  const kind = plan.sceneRecipe?.kind;
  if (!kind || kind === "concept") {
    return "generic";
  }

  return "procedural";
}

export function shouldGrowLibrary(quality: VisualRouteQuality): boolean {
  return quality === "generic" || quality === "procedural";
}
