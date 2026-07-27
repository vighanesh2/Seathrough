import { buildSceneRecipe } from "@/lib/diagrams/buildSceneRecipe";
import { normalizeMetaphorKey } from "@/lib/diagrams/normalizeMetaphor";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { CognitiveType } from "@/lib/schemas/lesson";
import type {
  TriggerDecision,
  TriggerEngine,
  TriggerInput,
} from "@/lib/triggers/types";
import type { DiagramAction } from "@/types/lesson";

type MetaphorRow = {
  concept_key: string;
  metaphor_vehicle: string;
  cognitive_type: CognitiveType;
  hidden_score: number;
  scene_shape: string;
};

/**
 * Decides generate vs keep. Recipe relevance is owned by buildSceneRecipe.
 */
export class HeuristicTriggerEngine implements TriggerEngine {
  async decide(input: TriggerInput): Promise<TriggerDecision> {
    const beat = input.beat;
    const cognitiveType: CognitiveType =
      beat.cognitiveType ?? inferCognitiveType(beat, input.prompt);

    const conceptKey = (
      beat.conceptKey ??
      beat.highlight ??
      beat.metaphorKey ??
      ""
    )
      .trim()
      .toLowerCase();

    let metaphor: MetaphorRow | null = null;
    try {
      const supabase = getServiceSupabase();
      if (conceptKey) {
        const { data, error } = await supabase
          .from("metaphors")
          .select(
            "concept_key, metaphor_vehicle, cognitive_type, hidden_score, scene_shape",
          )
          .eq("is_active", true)
          .ilike("concept_key", conceptKey)
          .limit(1)
          .maybeSingle();
        if (!error && data) metaphor = data as MetaphorRow;
      }
    } catch {
      // DB optional
    }

    const resolvedType = metaphor?.cognitive_type ?? cognitiveType;

    const built = buildSceneRecipe({
      prompt: input.prompt,
      conceptKey: beat.conceptKey,
      highlight: beat.highlight,
      metaphorKey:
        beat.metaphorKey ??
        metaphor?.metaphor_vehicle?.toLowerCase().replace(/\s+/g, "-"),
      sceneShape: beat.sceneShape,
      sceneRecipe: beat.sceneRecipe,
      label: beat.highlight ?? beat.conceptKey,
    });

    const metaphorKey = built.metaphorKey;
    const activeKey = normalizeMetaphorKey(input.activeMetaphorKey);

    let imageAction: DiagramAction = "generate";
    if (activeKey && metaphorKey && activeKey === metaphorKey) {
      imageAction = "keep";
    }

    if (beat.kind === "human_summary" && activeKey) {
      imageAction = "keep";
    }

    return {
      imageAction,
      metaphorKey,
      cognitiveType: resolvedType,
      confidence: metaphor ? 0.85 : built.recipe.kind !== "concept" ? 0.8 : 0.6,
      reason: `recipe:${built.recipe.kind} → ${metaphorKey}`,
    };
  }
}

function inferCognitiveType(
  beat: TriggerInput["beat"],
  prompt?: string,
): CognitiveType {
  const blob =
    `${beat.highlight ?? ""} ${beat.conceptKey ?? ""} ${beat.narration} ${prompt ?? ""}`.toLowerCase();
  if (/(stack|heap|pointer|reference|recursion|memory|garbage)/.test(blob)) {
    return "hidden_state";
  }
  if (/(loop|iterate|sort|search|while|for\b|compile|request)/.test(blob)) {
    return "process";
  }
  if (
    /(class|object|inherit|tree|list|graph|struct|circle|square|triangle|hexagon|polygon)/.test(
      blob,
    )
  ) {
    return "structural";
  }
  return "definition";
}

export const defaultTriggerEngine = new HeuristicTriggerEngine();
