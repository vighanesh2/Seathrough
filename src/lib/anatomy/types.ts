import type * as THREE from "three";

export const ANATOMY_STRUCTURE_IDS = [
  "heart",
  "right-atrium",
  "tricuspid-valve",
  "right-ventricle",
  "pulmonary-valve",
  "pulmonary-trunk",
  "right-pulmonary-artery",
  "left-pulmonary-artery",
  "right-lung",
  "left-lung",
  "alveoli",
  "right-pulmonary-veins",
  "left-pulmonary-veins",
  "left-atrium",
  "mitral-valve",
  "left-ventricle",
  "aortic-valve",
  "aorta",
  "superior-vena-cava",
  "inferior-vena-cava",
  "trachea",
  "main-bronchi",
  "diaphragm",
] as const;

export type AnatomyStructureId = (typeof ANATOMY_STRUCTURE_IDS)[number];

export const ANATOMY_ANIMATION_MODES = [
  "overview",
  "cardiac-cycle",
  "pulmonary-circulation",
  "systemic-outflow",
  "ventilation",
  "gas-exchange",
] as const;

export type AnatomyAnimationMode = (typeof ANATOMY_ANIMATION_MODES)[number];

export type CardiacPhase =
  | "filling"
  | "atrial-systole"
  | "ventricular-systole"
  | "ejection";

export type AnatomySource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
};

export type AnatomyStructure = {
  id: AnatomyStructureId;
  label: string;
  shortLabel: string;
  system: "cardiac" | "pulmonary" | "vascular" | "respiratory";
  description: string;
  function: string;
  reveal: number;
  sourceIds: string[];
};

export type AnatomySceneState = {
  reveal: number;
  selectedStructure: AnatomyStructureId | null;
  focusedStructures: AnatomyStructureId[];
  animationMode: AnatomyAnimationMode;
  playing: boolean;
  speed: number;
  reducedMotion: boolean;
};

export type AnatomySceneSnapshot = {
  selectedStructure: AnatomyStructureId | null;
  focusedStructures: AnatomyStructureId[];
  animationMode: AnatomyAnimationMode;
  cardiacPhase: CardiacPhase;
  oxygenation: "deoxygenated" | "oxygenating" | "oxygenated" | "mixed";
};

export type AnatomySceneHandle = {
  root: THREE.Group;
  pickables: THREE.Object3D[];
  update: (elapsed: number, dt: number) => void;
  setState: (state: Partial<AnatomySceneState>) => void;
  getState: () => AnatomySceneState;
  getSnapshot: () => AnatomySceneSnapshot;
  getStructureForObject: (
    object: THREE.Object3D,
  ) => AnatomyStructureId | null;
  getFocusTarget: (
    structure: AnatomyStructureId,
  ) => { position: THREE.Vector3; target: THREE.Vector3 } | null;
  dispose: () => void;
};

export type AnatomyQuestionRequest = {
  question: string;
  selectedStructure?: AnatomyStructureId | null;
  sceneMode?: AnatomyAnimationMode;
};

export type AnatomyCitation = AnatomySource & {
  excerpt: string;
};

export type AnatomyAnswer = {
  answer: string;
  citations: AnatomyCitation[];
  focusStructures: AnatomyStructureId[];
  animationMode: AnatomyAnimationMode;
  reveal: number;
  supported: boolean;
};
