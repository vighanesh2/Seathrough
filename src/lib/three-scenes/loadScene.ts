import { buildThreeScene, type ThreeSceneHandle } from "@/lib/three-scenes/buildScene";
import { loadCardiopulmonaryScene } from "@/lib/three-scenes/scenes/cardiopulmonary";
import type { ThreeScenePlan } from "@/lib/three-scenes/decide";
import type { AnatomySceneHandle } from "@/lib/anatomy/types";

export type LoadedThreeScene = {
  handle: ThreeSceneHandle;
  anatomy: AnatomySceneHandle | null;
};

export async function loadThreeScene(
  plan: ThreeScenePlan,
  onProgress?: (value: number) => void,
): Promise<LoadedThreeScene> {
  if (plan.id === "cardiopulmonary") {
    const anatomy = await loadCardiopulmonaryScene(
      {
        reveal: plan.reveal,
        animationMode:
          typeof plan.params.animationMode === "string"
            ? plan.params.animationMode === "cardiac-cycle" ||
              plan.params.animationMode === "pulmonary-circulation" ||
              plan.params.animationMode === "systemic-outflow" ||
              plan.params.animationMode === "ventilation" ||
              plan.params.animationMode === "gas-exchange"
              ? plan.params.animationMode
              : "overview"
            : "overview",
      },
      onProgress,
    );
    return { handle: anatomy, anatomy };
  }

  onProgress?.(1);
  return {
    handle: buildThreeScene({ plan, reveal: plan.reveal }),
    anatomy: null,
  };
}
