export type { SceneBeat, SceneProgram, SceneAgentLine, SceneAgentKind } from "@/lib/scene-explain/types";
export {
  MAX_SCENE_CODE_CHARS,
  MAX_SCENE_REPAIR_ATTEMPTS,
  SCENE_LOAD_TIMEOUT_MS,
} from "@/lib/scene-explain/types";
export { inspectSceneCode } from "@/lib/scene-explain/inspectCode";
export { parseSceneProgram, parseScenePlan, parseRepairedCode } from "@/lib/scene-explain/parseProgram";
export { generateSceneProgram } from "@/lib/scene-explain/generateScene";
export { repairSceneCode } from "@/lib/scene-explain/repairScene";
export { buildSceneIframeSrc } from "@/lib/scene-explain/iframeRuntime";
export { SCENE_CONTRACT } from "@/lib/scene-explain/prompts";
export {
  builtinSceneForPrompt,
  fallbackSceneForPrompt,
  OSMOSIS_SCENE,
  MATRIX_MULT_SCENE,
} from "@/lib/scene-explain/builtinScenes";
