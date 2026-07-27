import { buildSceneRecipe } from "@/lib/diagrams/buildSceneRecipe";
import type { SceneRecipe } from "@/lib/schemas/sceneRecipe";
import type { SceneShape } from "@/lib/schemas/lesson";
import type { DiagramScene } from "@/types/lesson";

export type ResolveSceneInput = {
  sceneShape?: SceneShape | null;
  sceneRecipe?: SceneRecipe;
  metaphorKey?: string;
  conceptKey?: string;
  highlight?: string;
  prompt?: string;
  label?: string;
  title?: string;
};

/** Always return a drawable scene (recipe + legacy shape badge). */
export function resolveScene(input: ResolveSceneInput): DiagramScene {
  const built = buildSceneRecipe(input);
  return {
    metaphorKey: built.metaphorKey,
    label: built.label,
    shape: built.shape,
    recipe: built.recipe,
  };
}

/** @deprecated use buildSceneRecipe / resolveScene */
export function inferShapeFromText(text: string): SceneShape | undefined {
  const scene = resolveScene({ prompt: text });
  return scene.shape === "custom" ? undefined : scene.shape;
}
