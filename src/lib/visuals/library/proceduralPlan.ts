import { buildSceneRecipe } from "@/lib/diagrams/buildSceneRecipe";
import type { CognitiveType } from "@/lib/schemas/lesson";
import type { SceneRecipe } from "@/lib/schemas/sceneRecipe";
import type { VisualPlan } from "@/lib/visuals/types";
import { displayLabelFromKey, makeTopicKey } from "@/lib/visuals/library/topicKey";

export type LearnedPlanInput = {
  prompt: string;
  conceptKey?: string;
  cognitiveType?: CognitiveType;
  highlight?: string;
  /** Existing routed plan — reused when already better than a blank concept card */
  routed?: VisualPlan | null;
};

/**
 * Build a deterministic VisualPlan for topics not in the curated catalog.
 * Prefer structured Rough recipes over empty boards. Never emits executable code.
 */
export function buildLearnedVisualPlan(input: LearnedPlanInput): VisualPlan {
  const topicKey = makeTopicKey({
    prompt: input.prompt,
    conceptKey: input.conceptKey,
  });
  const label =
    input.highlight?.trim().slice(0, 40) ||
    input.conceptKey?.trim().slice(0, 40) ||
    displayLabelFromKey(topicKey);

  const routed = input.routed;
  if (
    routed &&
    routed.renderer !== "rough" &&
    (routed.assetId || routed.source || routed.formula)
  ) {
    return sanitizePlan(routed);
  }

  if (
    routed?.renderer === "rough" &&
    routed.sceneRecipe &&
    routed.sceneRecipe.kind !== "concept"
  ) {
    return sanitizePlan(routed);
  }

  const recipe = pickLearnedRecipe({
    prompt: input.prompt,
    conceptKey: input.conceptKey,
    cognitiveType: input.cognitiveType,
    highlight: input.highlight,
    label,
  });

  return {
    renderer: "rough",
    formula: routed?.formula,
    sceneRecipe: recipe,
    actions: [{ type: "write", text: label }],
  };
}

function pickLearnedRecipe(input: {
  prompt: string;
  conceptKey?: string;
  cognitiveType?: CognitiveType;
  highlight?: string;
  label: string;
}): SceneRecipe {
  // Literal geometry / metaphor seeds first
  const built = buildSceneRecipe({
    prompt: input.prompt,
    conceptKey: input.conceptKey,
    highlight: input.highlight,
    label: input.label,
  });
  if (built.recipe.kind !== "concept") {
    return built.recipe;
  }

  const blob = [
    input.prompt,
    input.conceptKey,
    input.highlight,
    input.cognitiveType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    input.cognitiveType === "process" ||
    /\b(process|cycle|steps?|pipeline|lifecycle|flow)\b/.test(blob)
  ) {
    return {
      kind: "cycle",
      label: input.label,
    };
  }

  if (
    input.cognitiveType === "structural" ||
    /\b(hierarchy|inherit|tree|structure|relation|parts?)\b/.test(blob)
  ) {
    return {
      kind: "tree",
      label: input.label,
    };
  }

  if (/\b(stack|layers?|pile)\b/.test(blob)) {
    return {
      kind: "stack",
      label: input.label,
      layers: splitLayers(input.highlight ?? input.label),
    };
  }

  if (/\b(compare|versus|vs\.?|before|after)\b/.test(blob)) {
    return {
      kind: "stack",
      label: input.label,
      layers: ["before", "after"],
    };
  }

  return {
    kind: "concept",
    label: input.label,
    note: teachingNote(input.cognitiveType),
  };
}

function teachingNote(cognitiveType?: CognitiveType): string {
  switch (cognitiveType) {
    case "process":
      return "steps of the idea";
    case "structural":
      return "parts and how they connect";
    case "hidden_state":
      return "what you cannot see directly";
    case "definition":
    default:
      return "core idea to remember";
  }
}

function splitLayers(text: string): string[] {
  const parts = text
    .split(/[,/;|→>]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 4);
  return parts.length >= 2 ? parts : [text.slice(0, 24) || "layer"];
}

function sanitizePlan(plan: VisualPlan): VisualPlan {
  return {
    renderer: plan.renderer,
    assetId: plan.assetId,
    source: plan.source,
    formula: plan.formula,
    sceneRecipe: plan.sceneRecipe,
    actions: plan.actions ?? [],
  };
}
