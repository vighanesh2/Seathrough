import { buildSceneRecipe } from "@/lib/diagrams/buildSceneRecipe";
import { coerceSceneRecipe } from "@/lib/schemas/sceneRecipe";
import { getVisualAsset } from "@/lib/visuals/assets/catalog";
import {
  buildFlowchartFromPrompt,
  normalizeMermaidSource,
  wantsFlowchart,
} from "@/lib/visuals/mermaidFlow";
import { matchMetaphor } from "@/lib/visuals/metaphors/map";
import {
  acceptAssetId,
  matchAssetToPrompt,
  wantsRightTriangle,
  wantsSimpleMath,
} from "@/lib/visuals/relevance";
import type { VisualPlan, VisualRenderer } from "@/lib/visuals/types";

export type RouteVisualInput = {
  /** User question — source of truth for asset relevance */
  prompt: string;
  narration?: string;
  conceptKey?: string;
  plan?: Partial<VisualPlan> | null;
};

/**
 * Prompt-first visual router.
 * Metaphor map (data) → curated templates → procedurals → Rough fallback.
 * LLM suggestions are hints only.
 */
export function routeVisual(input: RouteVisualInput): VisualPlan {
  const prompt = input.prompt.trim();
  const llm = input.plan;
  const formulaHint = pickFormula(prompt, llm);

  // 1) Flowcharts ONLY when the user asked for a flow / process diagram
  if (wantsFlowchart(prompt)) {
    return {
      renderer: "mermaid",
      source: normalizeMermaidSource(llm?.source, prompt),
      actions: [],
    };
  }

  // 2) Metaphor map — abstract concepts → approved visual (same-repo data)
  const metaphor = matchMetaphor(prompt);
  if (metaphor) {
    const { entry } = metaphor;
    if (entry.renderer === "mermaid" || entry.mermaidSource) {
      return {
        renderer: "mermaid",
        source: entry.mermaidSource ?? buildFlowchartFromPrompt(prompt),
        actions: [],
      };
    }
    if (entry.assetId && getVisualAsset(entry.assetId)) {
      const rawActions = entry.defaultActions?.length
        ? entry.defaultActions
        : defaultTemplateActions(entry.assetId, entry.id);
      const actions = rawActions.some((a) => a.type === "draw")
        ? rawActions
        : [{ type: "draw" as const }, ...rawActions];
      return {
        renderer: "template",
        assetId: entry.assetId,
        formula: formulaHint,
        actions,
      };
    }
  }

  // 3) Math → figure + formula (never formula alone)
  if (wantsRightTriangle(prompt) || wantsSimpleMath(prompt)) {
    if (wantsRightTriangle(prompt) || /\btriangle\b/i.test(prompt)) {
      return {
        renderer: "template",
        assetId: "right-triangle",
        formula: formulaHint ?? "a^2 + b^2 = c^2",
        actions: [
          { type: "draw" },
          { type: "label", anchor: "a", text: "a" },
          { type: "label", anchor: "b", text: "b" },
          { type: "label", anchor: "c", text: "c (hypotenuse)" },
          { type: "label", anchor: "formula", text: "a² + b² = c²" },
        ],
      };
    }

    if (/\bhexagon\b/i.test(prompt)) {
      return {
        renderer: "template",
        assetId: "hexagon-shape",
        formula: formulaHint,
        actions: defaultTemplateActions("hexagon-shape", "Hexagon"),
      };
    }

    if (wantsCoordinateGraph(prompt) || wantsEquationBoard(prompt)) {
      return {
        renderer: "mafs",
        source: llm?.source ?? "line",
        formula: formulaHint ?? guessKatex(prompt),
        actions: [],
      };
    }

    const mathSketch = buildSceneRecipe({
      prompt,
      conceptKey: input.conceptKey,
      label: shortLabel(prompt, input.conceptKey),
    });
    return {
      renderer: "rough",
      formula: formulaHint ?? guessKatex(prompt),
      sceneRecipe: mathSketch.recipe,
      actions: [{ type: "write", text: mathSketch.label }],
    };
  }

  // 4) Explicit graph request
  if (wantsCoordinateGraph(prompt)) {
    return {
      renderer: "mafs",
      source: llm?.source ?? "line",
      formula: formulaHint,
      actions: [],
    };
  }

  // 5) Literal curated / generated templates
  const fromLlm = acceptAssetId(prompt, llm?.assetId);
  const fromPrompt = matchAssetToPrompt(prompt);
  let asset = fromLlm ?? fromPrompt;

  if (asset && metaphor?.entry.forbiddenAssetIds?.includes(asset.id)) {
    asset = undefined;
  }

  if (asset) {
    if (
      asset.id === "loop-cycle" &&
      (wantsFlowchart(prompt) || /\blife\s*cycle|sdlc\b/i.test(prompt))
    ) {
      return {
        renderer: "mermaid",
        source: buildFlowchartFromPrompt(prompt),
        actions: [],
      };
    }

    const rawActions =
      llm?.actions?.length && fromLlm
        ? llm.actions
        : defaultTemplateActions(asset.id, asset.title);
    const actions = rawActions.some((a) => a.type === "draw")
      ? rawActions
      : [{ type: "draw" as const }, ...rawActions];

    return {
      renderer: "template",
      assetId: asset.id,
      formula: formulaHint,
      actions,
    };
  }

  // 6) LLM katex alone → still draw + formula
  if (
    llm?.renderer === "katex" ||
    /\\frac|\\sum|\$\$/.test(llm?.source ?? "")
  ) {
    const sketch = buildSceneRecipe({
      prompt,
      conceptKey: input.conceptKey,
      label: shortLabel(prompt, input.conceptKey),
    });
    return {
      renderer: "rough",
      formula:
        llm?.source && !isFancyJunk(llm.source)
          ? llm.source
          : formulaHint ?? guessKatex(prompt),
      sceneRecipe: sketch.recipe,
      actions: [{ type: "write", text: sketch.label }],
    };
  }

  // 7) Rough fallback
  const sketch = buildSceneRecipe({
    prompt,
    conceptKey: input.conceptKey,
    label: shortLabel(prompt, input.conceptKey),
    sceneRecipe: coerceSceneRecipe(llm?.sceneRecipe),
  });

  return {
    renderer: "rough",
    formula: formulaHint,
    sceneRecipe: sketch.recipe,
    actions: [{ type: "write", text: sketch.label }],
  };
}

function wantsCoordinateGraph(prompt: string): boolean {
  return /\b(coordinate|parabola|sine wave|cosine wave|plot graph|xy-plane|graph of|plot the|function graph)\b/i.test(
    prompt,
  );
}

function wantsEquationBoard(prompt: string): boolean {
  return /\b(algebra|equation|formula|sine|cosine|tangent)\b/i.test(prompt);
}

function pickFormula(
  prompt: string,
  llm?: Partial<VisualPlan> | null,
): string | undefined {
  if (llm?.formula && !isFancyJunk(llm.formula)) return llm.formula;
  if (
    llm?.renderer === "katex" &&
    llm.source &&
    !isFancyJunk(llm.source)
  ) {
    return llm.source;
  }
  if (
    llm?.source &&
    /\\frac|\\sum|\^|_/.test(llm.source) &&
    !isFancyJunk(llm.source)
  ) {
    return llm.source;
  }
  if (wantsSimpleMath(prompt) || wantsRightTriangle(prompt)) {
    return guessKatex(prompt);
  }
  return undefined;
}

function defaultTemplateActions(assetId: string, title: string) {
  const asset = getVisualAsset(assetId);
  const anchor = asset ? Object.keys(asset.anchors)[0] : "center";
  return [
    { type: "draw" as const },
    { type: "label" as const, anchor: anchor ?? "center", text: title },
  ];
}

function shortLabel(prompt: string, conceptKey?: string): string {
  if (conceptKey?.trim()) return conceptKey.trim().slice(0, 40);
  return (
    prompt
      .replace(/^(please\s+)?(explain|what is|what's|define|teach me)\s+/i, "")
      .replace(/\?+$/, "")
      .trim()
      .slice(0, 40) || "idea"
  );
}

function guessKatex(prompt: string): string {
  const t = prompt.toLowerCase();
  if (t.includes("pythagoras") || t.includes("hypotenuse")) {
    return "a^2 + b^2 = c^2";
  }
  if (/\bsine|\bsin\b/.test(t)) return "\\sin\\theta";
  if (/\bcosine|\bcos\b/.test(t)) return "\\cos\\theta";
  if (/\btangent|\btan\b/.test(t)) return "\\tan\\theta";
  if (/\bequation|algebra|formula\b/.test(t)) return "y = mx + b";
  return "E = mc^2";
}

function isFancyJunk(source: string): boolean {
  return /horse|rider|airplane|saddle/i.test(source);
}

export function listAssetIdsForPrompt(): string {
  return [
    "class-blueprint",
    "right-triangle",
    "hexagon-shape",
    "stack-plates",
    "queue-line",
    "variable-box",
    "function-machine",
    "loop-cycle",
    "heart-simple",
    "airplane-side-view",
    "horse-rider",
    "binary-bits",
    "inheritance-tree",
    "encryption-lock",
    "api-waiter",
    "pointer-arrow",
  ].join(", ");
}

export function visualKey(plan: VisualPlan): string {
  return `${plan.renderer}:${plan.assetId ?? ""}:${plan.source ?? ""}:${plan.formula ?? ""}:${plan.sceneRecipe?.kind ?? ""}`;
}

export type { VisualRenderer };
