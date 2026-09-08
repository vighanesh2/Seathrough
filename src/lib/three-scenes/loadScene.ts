import { buildThreeScene, type ThreeSceneHandle } from "@/lib/three-scenes/buildScene";
import { loadCardiopulmonaryScene } from "@/lib/three-scenes/scenes/cardiopulmonary";
import { loadEyeScene } from "@/lib/three-scenes/scenes/eye";
import {
  loadBrainScene,
  loadKidneyScene,
} from "@/lib/three-scenes/scenes/organs";
import type { ThreeScenePlan } from "@/lib/three-scenes/decide";
import type {
  AnatomyAnimationMode,
  AnatomySceneHandle,
} from "@/lib/anatomy/types";
import {
  isBrainMode,
  isCardiopulmonaryMode,
  isEyeMode,
  isKidneyMode,
} from "@/lib/anatomy/registry";

export type LoadedThreeScene = {
  handle: ThreeSceneHandle;
  anatomy: AnatomySceneHandle | null;
};

function animationModeFromParams(
  plan: ThreeScenePlan,
  scene: "cardiopulmonary" | "eye" | "brain" | "kidney",
): AnatomyAnimationMode {
  const raw =
    typeof plan.params.animationMode === "string"
      ? plan.params.animationMode
      : "overview";
  if (scene === "eye") {
    return isEyeMode(raw as AnatomyAnimationMode)
      ? (raw as AnatomyAnimationMode)
      : "overview";
  }
  if (scene === "brain") {
    return isBrainMode(raw as AnatomyAnimationMode)
      ? (raw as AnatomyAnimationMode)
      : "overview";
  }
  if (scene === "kidney") {
    return isKidneyMode(raw as AnatomyAnimationMode)
      ? (raw as AnatomyAnimationMode)
      : "overview";
  }
  return isCardiopulmonaryMode(raw as AnatomyAnimationMode)
    ? (raw as AnatomyAnimationMode)
    : "overview";
}

export async function loadThreeScene(
  plan: ThreeScenePlan,
  onProgress?: (value: number) => void,
): Promise<LoadedThreeScene> {
  if (plan.id === "cardiopulmonary") {
    const anatomy = await loadCardiopulmonaryScene(
      {
        reveal: plan.reveal,
        animationMode: animationModeFromParams(plan, "cardiopulmonary"),
      },
      onProgress,
    );
    return { handle: anatomy, anatomy };
  }

  if (plan.id === "eye") {
    const anatomy = await loadEyeScene(
      {
        reveal: plan.reveal,
        animationMode: animationModeFromParams(plan, "eye"),
      },
      onProgress,
    );
    return { handle: anatomy, anatomy };
  }

  if (plan.id === "brain") {
    const anatomy = await loadBrainScene(
      {
        reveal: plan.reveal,
        animationMode: animationModeFromParams(plan, "brain"),
      },
      onProgress,
    );
    return { handle: anatomy, anatomy };
  }

  if (plan.id === "kidney") {
    const anatomy = await loadKidneyScene(
      {
        reveal: plan.reveal,
        animationMode: animationModeFromParams(plan, "kidney"),
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
