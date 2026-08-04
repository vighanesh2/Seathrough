import { expandDrawingPrompt } from "@/lib/automatic-drawing/expandPrompt";
import { generateSceneGraph } from "@/lib/automatic-drawing/sceneGraph/generateScene";
import { sceneGraphToPlayable } from "@/lib/automatic-drawing/sceneGraph/toPlayable";
import {
  planToPlayable,
  type PlayableStroke,
  type WhiteboardPlan,
} from "@/lib/automatic-drawing/strokePlan";
import {
  buildDeterministicShapePlan,
  canBuildDeterministically,
  detectDrawingIntent,
  validatePlanAgainstIntent,
} from "@/lib/automatic-drawing/validateDrawing";

export type GeneratedWhiteboardDrawing = {
  plan: Pick<WhiteboardPlan, "title" | "width" | "height"> & {
    commands?: WhiteboardPlan["commands"];
  };
  strokes: PlayableStroke[];
  source: "deterministic" | "scene-graph" | "scene-graph-retry";
  originalPrompt: string;
  expandedPrompt: string;
};

export async function generateWhiteboardDrawing(
  description: string,
): Promise<GeneratedWhiteboardDrawing> {
  const trimmed = description.trim();
  if (!trimmed) throw new Error("Description is required");
  if (trimmed.length > 800) {
    throw new Error("Description is too long (max 800 characters)");
  }

  // 1) Expand short user prompt into a richer compositional brief.
  const expanded = await expandDrawingPrompt(trimmed);

  // Intent from the user's original words (e.g. "pentagon" stays authoritative).
  const intent = detectDrawingIntent(trimmed);

  // Known shapes: build exactly — don't let the model invent side counts.
  if (canBuildDeterministically(intent)) {
    const plan = buildDeterministicShapePlan(intent);
    if (expanded.title) plan.title = expanded.title;
    const check = validatePlanAgainstIntent(plan, intent);
    if (!check.ok) {
      throw new Error(`Internal shape check failed: ${check.reason}`);
    }
    return {
      plan,
      strokes: planToPlayable(plan),
      source: "deterministic",
      originalPrompt: expanded.originalPrompt,
      expandedPrompt: expanded.expandedPrompt,
    };
  }

  // 2) Compose an aiSketch-style hierarchical scene graph, then convert to strokes.
  try {
    const scene = await generateSceneGraph(expanded.expandedPrompt);
    const playable = sceneGraphToPlayable(scene);
    return {
      plan: {
        title: playable.title,
        width: playable.width,
        height: playable.height,
      },
      strokes: playable.strokes,
      source: "scene-graph",
      originalPrompt: expanded.originalPrompt,
      expandedPrompt: expanded.expandedPrompt,
    };
  } catch (firstError) {
    // One retry with a tighter instruction.
    const retryBrief = `${expanded.expandedPrompt}

Previous attempt failed (${firstError instanceof Error ? firstError.message : "invalid scene"}).
Return a valid scene graph with 15–30 leaf nodes, grouped components, soft fills then outlines.`;
    const scene = await generateSceneGraph(retryBrief);
    const playable = sceneGraphToPlayable(scene);
    return {
      plan: {
        title: playable.title,
        width: playable.width,
        height: playable.height,
      },
      strokes: playable.strokes,
      source: "scene-graph-retry",
      originalPrompt: expanded.originalPrompt,
      expandedPrompt: expanded.expandedPrompt,
    };
  }
}
