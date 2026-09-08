import type { VisualPlan } from "@/lib/visuals/types";
import { getVisualAsset } from "@/lib/visuals/assets/catalog";
import { matchAssetToPrompt } from "@/lib/visuals/relevance";

const STRONG_FIGURE_SCORE = 10;
const COMPANION_FIGURE_SCORE = 6;

/** High-confidence offline diagram for this prompt (template-first). */
export function strongFigurePlan(prompt: string, formula?: string): VisualPlan | null {
  const asset = matchAssetToPrompt(prompt, STRONG_FIGURE_SCORE);
  if (!asset) return null;
  return {
    renderer: "template",
    assetId: asset.id,
    formula: formula?.trim() || undefined,
    actions: [
      { type: "draw" },
      { type: "label", anchor: "center", text: asset.title },
    ],
  };
}

/**
 * Attach a catalog diagram to a text/pen plan so the board is never
 * figure-less when we have a relevant offline SVG.
 */
export function withCompanionFigure(
  plan: VisualPlan,
  prompt: string,
): VisualPlan {
  if (plan.renderer === "jsxgraph" || plan.renderer === "mermaid") {
    return plan;
  }
  if (plan.assetId && getVisualAsset(plan.assetId)) {
    return plan;
  }
  const asset = matchAssetToPrompt(prompt, COMPANION_FIGURE_SCORE);
  if (!asset) return plan;

  const hasDraw = (plan.actions ?? []).some((a) => a.type === "draw");
  const actions = hasDraw
    ? plan.actions
    : [
        { type: "draw" as const },
        {
          type: "label" as const,
          anchor: "center",
          text: asset.title,
        },
        ...(plan.actions ?? []),
      ];

  return {
    ...plan,
    assetId: asset.id,
    actions,
  };
}
