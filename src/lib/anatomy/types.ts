import type * as THREE from "three";

export const CARDIOPULMONARY_STRUCTURE_IDS = [
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

export const EYE_STRUCTURE_IDS = [
  "eye",
  "sclera",
  "cornea",
  "iris",
  "pupil",
  "lens",
  "aqueous-humor",
  "vitreous",
  "retina",
  "fovea",
  "photoreceptors",
  "optic-nerve",
  "visual-cortex",
] as const;

export const BRAIN_STRUCTURE_IDS = [
  "brain",
  "cerebrum",
  "frontal-lobe",
  "parietal-lobe",
  "temporal-lobe",
  "occipital-lobe",
  "cerebellum",
  "brainstem",
  "spinal-cord",
] as const;

export const KIDNEY_STRUCTURE_IDS = [
  "kidney",
  "renal-cortex",
  "renal-medulla",
  "renal-pelvis",
  "renal-artery",
  "renal-vein",
  "ureter",
  "nephron",
  "glomerulus",
  "collecting-duct",
] as const;

export const ANATOMY_STRUCTURE_IDS = [
  ...CARDIOPULMONARY_STRUCTURE_IDS,
  ...EYE_STRUCTURE_IDS,
  ...BRAIN_STRUCTURE_IDS,
  ...KIDNEY_STRUCTURE_IDS,
] as const;

export type AnatomyStructureId = (typeof ANATOMY_STRUCTURE_IDS)[number];
export type EyeStructureId = (typeof EYE_STRUCTURE_IDS)[number];

export const CARDIOPULMONARY_ANIMATION_MODES = [
  "overview",
  "cardiac-cycle",
  "pulmonary-circulation",
  "systemic-outflow",
  "ventilation",
  "gas-exchange",
] as const;

export const EYE_ANIMATION_MODES = [
  "overview",
  "light-path",
  "accommodation",
  "pupil-reflex",
  "photoreceptors",
  "neural-signal",
] as const;

export const BRAIN_ANIMATION_MODES = [
  "overview",
  "sensory-processing",
  "motor-control",
  "neural-signal",
] as const;

export const KIDNEY_ANIMATION_MODES = [
  "overview",
  "filtration",
  "reabsorption",
  "urine-flow",
] as const;

/** Union of all anatomy animation modes (shared "overview" appears once). */
export const ANATOMY_ANIMATION_MODES = [
  "overview",
  "cardiac-cycle",
  "pulmonary-circulation",
  "systemic-outflow",
  "ventilation",
  "gas-exchange",
  "light-path",
  "accommodation",
  "pupil-reflex",
  "photoreceptors",
  "neural-signal",
  "sensory-processing",
  "motor-control",
  "filtration",
  "reabsorption",
  "urine-flow",
] as const;

export type AnatomyAnimationMode = (typeof ANATOMY_ANIMATION_MODES)[number];
export type CardiopulmonaryAnimationMode =
  (typeof CARDIOPULMONARY_ANIMATION_MODES)[number];
export type EyeAnimationMode = (typeof EYE_ANIMATION_MODES)[number];
export type BrainAnimationMode = (typeof BRAIN_ANIMATION_MODES)[number];
export type KidneyAnimationMode = (typeof KIDNEY_ANIMATION_MODES)[number];

export const ANATOMY_SCENE_IDS = [
  "cardiopulmonary",
  "eye",
  "brain",
  "kidney",
] as const;
export type AnatomySceneId = (typeof ANATOMY_SCENE_IDS)[number];

export type CardiacPhase =
  | "filling"
  | "atrial-systole"
  | "ventricular-systole"
  | "ejection";

export type VisionPhase =
  | "incoming"
  | "focusing"
  | "inverted"
  | "transducing"
  | "cortical";

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
  system:
    | "cardiac"
    | "pulmonary"
    | "vascular"
    | "respiratory"
    | "ocular"
    | "optical"
    | "neural"
    | "cerebral"
    | "renal"
    | "urinary";
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
  cardiacPhase?: CardiacPhase;
  oxygenation?: "deoxygenated" | "oxygenating" | "oxygenated" | "mixed";
  visionPhase?: VisionPhase;
  imageOrientation?: "inverted" | "cortical";
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
  sceneId?: AnatomySceneId;
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
