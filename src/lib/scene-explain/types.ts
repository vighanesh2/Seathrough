export type SceneBeat = {
  order: number;
  narration: string;
  reveal: number;
};

export type SceneProgram = {
  title: string;
  maxReveal: number;
  beats: SceneBeat[];
  code: string;
};

export type SceneAgentKind = "status" | "fix" | "ready" | "error";

export type SceneAgentLine = {
  id: string;
  kind: SceneAgentKind;
  text: string;
};

export type SceneGenerateInput = {
  prompt: string;
  priorTitle?: string;
  priorSummary?: string;
};

export type SceneRepairInput = {
  prompt: string;
  title: string;
  code: string;
  error: string;
  attempt: number;
};

export const MAX_SCENE_CODE_CHARS = 60_000;
export const MAX_SCENE_REPAIR_ATTEMPTS = 3;
export const SCENE_LOAD_TIMEOUT_MS = 22_000;
