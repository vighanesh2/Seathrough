import type { LessonBeatParsed } from "@/lib/schemas/lesson";
import { classifyVisualPlan } from "@/lib/visuals/library/classify";
import {
  buildBoardScriptPlan,
  isWeakVisualPlan,
  peekHeuristicBoardScript,
} from "@/lib/visuals/library/boardScriptPlan";
import { buildLearnedVisualPlan } from "@/lib/visuals/library/proceduralPlan";
import {
  lookupVisualLibrary,
  rememberVisualLibrary,
} from "@/lib/visuals/library/store";
import {
  displayLabelFromKey,
  makeTopicKey,
} from "@/lib/visuals/library/topicKey";
import { topicVisualPlanFor } from "@/lib/topics/plan";
import {
  strongFigurePlan,
  withCompanionFigure,
} from "@/lib/visuals/companionFigure";
import { decideVisual, type VisualTriggerResult } from "@/lib/triggers/visualTrigger";
import { visualStableKey } from "@/lib/visuals/router";
import { visualPlanSchema, type VisualPlan } from "@/lib/visuals/types";

export type ResolveVisualInput = {
  prompt: string;
  beat: LessonBeatParsed;
  activeVisualKey?: string;
  hasVisual: boolean;
  /** Prior lesson / root prompt so follow-ups can rematch the same topic. */
  topicHint?: string;
};

/**
 * Curated router first → library reuse → on-the-go board_script for weak misses.
 * Same final visual key as the active board → keep (no remount / redraw).
 */
export async function resolveVisualWithLibrary(
  input: ResolveVisualInput,
): Promise<VisualTriggerResult> {
  const topicKey = makeTopicKey({
    prompt: input.prompt,
    conceptKey: input.beat.conceptKey,
  });

  // A curated interactive beats everything else we could route to, and it is
  // cheap to rebuild, so it is checked before the cache.
  const topicPlan = topicVisualPlanFor(
    input.prompt,
    input.beat.conceptKey,
    input.topicHint,
  );
  if (topicPlan) {
    return keepIfSame(
      input.activeVisualKey,
      topicPlan,
      `topic:${topicPlan.topicId}`,
    );
  }

  // A later beat's concept key / LLM visual must not replace a live
  // interactive with the generic function icon.
  if (input.hasVisual && input.activeVisualKey?.startsWith("jsxgraph:")) {
    const locked = topicVisualPlanFor(input.prompt);
    if (locked) {
      return keepIfSame(
        input.activeVisualKey,
        locked,
        `topic-lock:${locked.topicId}`,
      );
    }
    return {
      action: "keep",
      plan: null,
      reason: "keep-jsxgraph-board",
    };
  }

  // Offline diagram pack (janosh / Commons / curated SVGs) before pen-only.
  const figure = strongFigurePlan(
    input.prompt,
    input.beat.highlight ?? input.beat.conceptKey,
  );
  if (figure) {
    return keepIfSame(
      input.activeVisualKey,
      figure,
      `figure:${figure.assetId}`,
    );
  }

  // Pen heuristics win even when the beat says "keep" (fixes wrong mafs graphs)
  const heuristic = peekHeuristicBoardScript(
    input.prompt,
    input.beat.conceptKey,
  );
  if (heuristic) {
    const parsedH = visualPlanSchema.safeParse(heuristic);
    const plan = withCompanionFigure(
      parsedH.success ? parsedH.data : heuristic,
      input.prompt,
    );
    await rememberVisualLibrary({
      topicKey,
      displayLabel:
        plan.boardScript?.title ||
        input.beat.conceptKey ||
        displayLabelFromKey(topicKey),
      sourcePrompt: input.prompt,
      conceptKey: input.beat.conceptKey,
      plan,
    });
    return keepIfSame(
      input.activeVisualKey,
      plan,
      `library:heuristic:${topicKey}`,
    );
  }

  const base = decideVisual(input);

  if (base.action !== "generate" || !base.plan) {
    return base;
  }

  const quality = classifyVisualPlan(base.plan);

  if (quality === "curated") {
    return keepIfSame(
      input.activeVisualKey,
      withCompanionFigure(base.plan, input.prompt),
      `curated:${base.reason}`,
    );
  }

  const cached = await lookupVisualLibrary(topicKey);
  if (cached) {
    const parsed = visualPlanSchema.safeParse(cached.plan);
    if (
      parsed.success &&
      !isWeakVisualPlan(parsed.data) &&
      classifyVisualPlan(parsed.data) !== "generic"
    ) {
      return keepIfSame(
        input.activeVisualKey,
        parsed.data,
        `library:hit:${cached.source}:${topicKey}`,
      );
    }
  }

  let plan: VisualPlan = base.plan;

  if (quality === "generic" || isWeakVisualPlan(base.plan)) {
    const scripted = await buildBoardScriptPlan({
      prompt: input.prompt,
      conceptKey: input.beat.conceptKey,
      cognitiveType: input.beat.cognitiveType,
      highlight: input.beat.highlight,
    });

    plan =
      scripted ??
      buildLearnedVisualPlan({
        prompt: input.prompt,
        conceptKey: input.beat.conceptKey,
        cognitiveType: input.beat.cognitiveType,
        highlight: input.beat.highlight,
        routed: base.plan,
      });
  }

  plan = withCompanionFigure(plan, input.prompt);

  const parsedLearned = visualPlanSchema.safeParse(plan);
  if (parsedLearned.success) plan = parsedLearned.data;

  const remembered = await rememberVisualLibrary({
    topicKey,
    displayLabel:
      input.beat.highlight?.trim() ||
      input.beat.conceptKey?.trim() ||
      plan.boardScript?.title ||
      displayLabelFromKey(topicKey),
    sourcePrompt: input.prompt,
    conceptKey: input.beat.conceptKey,
    plan,
  });

  return keepIfSame(
    input.activeVisualKey,
    plan,
    `library:learn:${remembered.source}:${topicKey}:${plan.renderer}${
      remembered.error ? ":warn" : ""
    }`,
  );
}

function keepIfSame(
  activeVisualKey: string | undefined,
  plan: VisualPlan,
  reason: string,
): VisualTriggerResult {
  const key = visualStableKey(plan);
  if (activeVisualKey && activeVisualKey === key) {
    // Patch formula onto the existing board without a full redraw
    if (plan.formula?.trim()) {
      return {
        action: "generate",
        plan,
        reason: `formula-patch:${reason}`,
      };
    }
    return {
      action: "keep",
      plan: null,
      reason: `same-final:${reason}`,
    };
  }
  return {
    action: "generate",
    plan,
    reason,
  };
}
