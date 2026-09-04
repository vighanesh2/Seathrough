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
    if (
      entry.assetId &&
      getVisualAsset(entry.assetId) &&
      !isWeakIconForConcept(prompt, entry.assetId)
    ) {
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

  // 3) Math → figure + formula (never formula alone).
  // No topic-specific hardcodes (e.g. Pythagoras → fixed triangle + a²+b²=c²);
  // board_script / rough teach from the prompt instead.
  if (wantsSimpleMath(prompt)) {
    if (/\bhexagon\b/i.test(prompt)) {
      return {
        renderer: "template",
        assetId: "hexagon-shape",
        formula: formulaHint,
        actions: defaultTemplateActions("hexagon-shape", "Hexagon"),
      };
    }

    if (wantsCoordinateGraph(prompt)) {
      return {
        renderer: "mafs",
        source: llm?.source ?? graphSourceForPrompt(prompt),
        formula: formulaHint ?? guessKatex(prompt),
        actions: [],
      };
    }

    // Algebra / equation teaching → Rough sketch only if no graph was asked.
    // (Pen board_script heuristics upgrade this in resolveVisualWithLibrary.)
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

  // Weak icon templates are not enough for conceptual "what/why/meaning" questions
  if (asset && isWeakIconForConcept(prompt, asset.id)) {
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
  return /\b(coordinate|parabola|sine wave|cosine wave|plot graph|xy-plane|graph of|plot the|function graph|graph (it|this|the))\b/i.test(
    prompt,
  );
}

function graphSourceForPrompt(prompt: string): string {
  const t = prompt.toLowerCase();
  if (/\bparabola|quadratic|x\^2|x²\b/.test(t)) return "parabola";
  if (/\bsine|sin\b/.test(t)) return "sine";
  return "line";
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
  if (wantsSimpleMath(prompt)) {
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
  const compact = t
    .replace(/\s+/g, "")
    .replace(/²/g, "^2")
    .replace(/x\^\{2\}/g, "x^2")
    .replace(/−/g, "-");
  if (/x\^2-5x\+6/.test(compact)) return "x^2 - 5x + 6 = 0";
  if (/x\^2/.test(compact) || /\bquadratic\b/.test(t)) {
    return "ax^2 + bx + c = 0";
  }
  if (/\bsine|\bsin\b/.test(t)) return "\\sin\\theta";
  if (/\bcosine|\bcos\b/.test(t)) return "\\cos\\theta";
  if (/\btangent|\btan\b/.test(t)) return "\\tan\\theta";
  if (/\by\s*=\s*mx|\bslope\s*intercept\b/.test(t)) return "y = mx + b";
  return "E = mc^2";
}

function isFancyJunk(source: string): boolean {
  return /horse|rider|airplane|saddle/i.test(source);
}

/** Prefer pen board scripts over single-glyph icons for teaching prompts. */
function isWeakIconForConcept(prompt: string, assetId: string): boolean {
  const wantsTeachingVisual =
    /\b(what (is|does)|what's|meaning|mean\b|explain|why|difference between|how does|using|teach|show|probability|coin|sample space)\b/i.test(
      prompt,
    );
  if (!wantsTeachingVisual) return false;
  return (
    assetId.startsWith("tabler-") ||
    assetId === "chart-area" ||
    assetId === "chart-dots"
  );
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

/** Identity for remount / keep — ignores formula so equation strips don't vanish on later beats. */
export function visualStableKey(plan: VisualPlan): string {
  const scriptSig = plan.boardScript?.steps
    ?.map((s) => {
      if (s.type === "write") return `w:${s.text}`;
      if (s.type === "note") return `n:${s.text}`;
      if (s.type === "arrow") return `a:${s.label ?? ""}`;
      return s.type;
    })
    .join("|");
  // Same topic on the same window = same board; a new interval, ODE, or
  // function expression reshapes it.
  const topicSig = plan.topicId
    ? plan.topicParams?.boardKind === "ode-solution"
      ? `${plan.topicId}:ode:${plan.topicParams.odeExpression};${plan.topicParams.initialT},${plan.topicParams.initialY};c=${plan.topicParams.parameterC};N=${plan.topicParams.timeSpan}`
      : plan.topicParams?.boardKind === "secant-tangent"
        ? `${plan.topicId}@${plan.topicParams.points.map((p) => p.join(",")).join(";")}`
        : plan.topicParams?.boardKind === "function-graph"
          ? `${plan.topicId}:fn:${plan.topicParams.expression};${plan.topicParams.xMin},${plan.topicParams.xMax}`
          : plan.topicParams?.boardKind === "construction"
            ? `${plan.topicId}:c:${plan.topicParams.constructionId}`
            : `${plan.topicId}`
    : "";
  return `${plan.renderer}:${plan.assetId ?? ""}:${plan.source ?? ""}:${plan.sceneRecipe?.kind ?? ""}:${scriptSig ?? ""}:${topicSig}`;
}

export function visualKey(plan: VisualPlan): string {
  return `${visualStableKey(plan)}:${plan.formula ?? ""}`;
}


export type { VisualRenderer };
