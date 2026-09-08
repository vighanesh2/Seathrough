import { z } from "zod";
import type { LessonPlanParsed } from "@/lib/schemas/lesson";

/** Built scenes the client can actually render. */
export const threeSceneIdSchema = z.enum([
  "pythagoras",
  "solar_system",
  "atom",
  "wave",
  "molecule",
  "vectors",
  "cardiopulmonary",
  "eye",
  "brain",
  "kidney",
  "heart",
  "cell",
  "generic",
]);

export type ThreeSceneId = z.infer<typeof threeSceneIdSchema>;

export const THREE_SCENE_IDS = threeSceneIdSchema.options;

/** What the lesson planner returns — the model decides, not a keyword list. */
export const threeSceneChoiceSchema = z
  .object({
    /** true when interactive 3D helps more than a flat board. */
    use: z.boolean(),
    /** Must be one of the built scene ids when use=true. */
    id: threeSceneIdSchema.optional(),
    title: z.string().min(1).max(80).optional(),
  })
  .nullable()
  .optional();

export type ThreeSceneChoice = z.infer<typeof threeSceneChoiceSchema>;

export const threeScenePlanSchema = z.object({
  id: threeSceneIdSchema,
  title: z.string().min(1).max(80),
  maxReveal: z.coerce.number().int().min(1).max(12).default(5),
  reveal: z.coerce.number().int().min(1).max(12).default(1),
  params: z
    .record(z.string(), z.union([z.number(), z.string(), z.boolean()]))
    .default({}),
});

export type ThreeScenePlan = z.infer<typeof threeScenePlanSchema>;

const SCENE_DEFAULTS: Record<
  ThreeSceneId,
  { title: string; maxReveal: number; params?: ThreeScenePlan["params"] }
> = {
  pythagoras: { title: "Pythagorean theorem", maxReveal: 5, params: { a: 3, b: 4 } },
  solar_system: { title: "Orbit & gravity", maxReveal: 4 },
  atom: { title: "Atomic structure", maxReveal: 4 },
  wave: { title: "Wave motion", maxReveal: 4 },
  molecule: { title: "Molecule", maxReveal: 3 },
  vectors: { title: "Forces & vectors", maxReveal: 4 },
  cardiopulmonary: {
    title: "Heart and lungs",
    maxReveal: 6,
    params: { animationMode: "overview" },
  },
  eye: {
    title: "Eye and vision",
    maxReveal: 6,
    params: { animationMode: "overview" },
  },
  brain: {
    title: "Brain and nervous system",
    maxReveal: 6,
    params: { animationMode: "overview" },
  },
  kidney: {
    title: "Kidney and filtration",
    maxReveal: 6,
    params: { animationMode: "overview" },
  },
  heart: { title: "How the heart works", maxReveal: 5 },
  cell: { title: "Cell structure", maxReveal: 4 },
  generic: { title: "Interactive model", maxReveal: 4 },
};

const ID_ALIASES: Record<string, ThreeSceneId> = {
  pythagoras: "pythagoras",
  pythagorean: "pythagoras",
  triangle: "pythagoras",
  solar_system: "solar_system",
  solar: "solar_system",
  orbit: "solar_system",
  planet: "solar_system",
  gravity: "solar_system",
  atom: "atom",
  atomic: "atom",
  electron: "atom",
  wave: "wave",
  sine: "wave",
  sound: "wave",
  molecule: "molecule",
  h2o: "molecule",
  water: "molecule",
  vectors: "vectors",
  vector: "vectors",
  force: "vectors",
  forces: "vectors",
  heart: "heart",
  cardiac: "heart",
  circulatory: "cardiopulmonary",
  heartbeat: "heart",
  cardiopulmonary: "cardiopulmonary",
  cardio_pulmonary: "cardiopulmonary",
  lung: "cardiopulmonary",
  lungs: "cardiopulmonary",
  pulmonary: "cardiopulmonary",
  respiratory: "cardiopulmonary",
  breathing: "cardiopulmonary",
  gas_exchange: "cardiopulmonary",
  eye: "eye",
  vision: "eye",
  eyeball: "eye",
  retina: "eye",
  cornea: "eye",
  pupil: "eye",
  optics: "eye",
  seeing: "eye",
  sight: "eye",
  brain: "brain",
  cerebral: "brain",
  cerebrum: "brain",
  cerebellum: "brain",
  brainstem: "brain",
  kidney: "kidney",
  renal: "kidney",
  nephron: "kidney",
  glomerulus: "kidney",
  cell: "cell",
  cellular: "cell",
  organelle: "cell",
  generic: "generic",
  organ: "generic",
  body: "generic",
  machine: "generic",
  structure: "generic",
  process: "generic",
};

function coerceSceneId(raw: unknown): ThreeSceneId | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((THREE_SCENE_IDS as readonly string[]).includes(key)) {
    return key as ThreeSceneId;
  }
  return ID_ALIASES[key] ?? null;
}

/**
 * Build a runnable scene from the planner's threeScene choice.
 * No prompt keyword matching — the LLM already decided.
 */
export function threeSceneFromChoice(
  choice:
    | { use: boolean; id?: string; title?: string }
    | null
    | undefined,
  fallbackTitle?: string,
): ThreeScenePlan | null {
  if (!choice || choice.use !== true) return null;
  const id = coerceSceneId(choice.id) ?? "generic";
  const defaults = SCENE_DEFAULTS[id];
  return {
    id,
    title: (choice.title?.trim() || fallbackTitle || defaults.title).slice(0, 80),
    maxReveal: defaults.maxReveal,
    reveal: 1,
    params: { ...(defaults.params ?? {}) },
  };
}

/** Prefer the planner decision on the lesson plan. */
export function threeSceneFromLessonPlan(
  plan: LessonPlanParsed,
): ThreeScenePlan | null {
  const selected = threeSceneFromChoice(
    plan.threeScene as ThreeSceneChoice | null | undefined,
    plan.title,
  );
  const lessonText = [
    plan.title,
    plan.humanSummary,
    ...plan.beats.map((beat) => beat.narration),
  ]
    .join(" ")
    .toLowerCase();
  const isCardiopulmonaryLesson =
    /\b(pulmonary|alveol(?:us|i|ar)?|cardiac|tricuspid|mitral|aortic|ventricle|atria|atrium|bronchi|diaphragm)\b/.test(
      lessonText,
    ) ||
    (/\bheart\b/.test(lessonText) &&
      /\b(blood|pump|chamber|valve|circulation|oxygen)\b/.test(lessonText)) ||
    (/\blungs?\b/.test(lessonText) &&
      /\b(breath|air|oxygen|carbon dioxide|gas exchange|blood)\b/.test(
        lessonText,
      ));
  const isEyeLesson =
    /\b(cornea|retina|fovea|photoreceptor|optic nerve|visual cortex|accommodation|pupil)\b/.test(
      lessonText,
    ) ||
    (/\b(eye|vision|seeing|sight)\b/.test(lessonText) &&
      /\b(see|light|focus|lens|image|inverted|upside|rod|cone|iris)\b/.test(
        lessonText,
      ));
  // New heart lessons use the full cardiopulmonary model. Keep the legacy
  // `heart` builder only for reopening conversations created before this scene.
  if (
    selected?.id === "heart" ||
    (isCardiopulmonaryLesson &&
      !isEyeLesson &&
      (!selected || selected.id === "generic"))
  ) {
    const defaults = SCENE_DEFAULTS.cardiopulmonary;
    return {
      id: "cardiopulmonary",
      title: selected?.title ?? plan.title,
      maxReveal: defaults.maxReveal,
      reveal: 1,
      params: { ...(defaults.params ?? {}) },
    };
  }
  if (
    isEyeLesson &&
    (!selected || selected.id === "generic" || selected.id === "eye")
  ) {
    const defaults = SCENE_DEFAULTS.eye;
    return {
      id: "eye",
      title: selected?.title ?? plan.title,
      maxReveal: defaults.maxReveal,
      reveal: 1,
      params: { ...(defaults.params ?? {}) },
    };
  }
  return selected;
}

/**
 * Soft restore when reopening a chat (no live plan field).
 * Prefer persisted plan.threeScene when available; this is only a fallback.
 */
export function threeSceneFromChoiceOrNull(
  choice: unknown,
  title?: string,
): ThreeScenePlan | null {
  const parsed = threeSceneChoiceSchema.safeParse(choice);
  if (!parsed.success) return null;
  return threeSceneFromChoice(parsed.data, title);
}

/** Map lesson beat order → scene reveal step. */
export function revealForBeat(
  plan: ThreeScenePlan,
  beatOrder: number,
  totalBeats?: number,
): number {
  const total = Math.max(1, totalBeats ?? plan.maxReveal);
  const t = Math.max(1, Math.min(beatOrder, total));
  const step = Math.ceil((t / total) * plan.maxReveal);
  return Math.max(1, Math.min(plan.maxReveal, step));
}

/** Prompt snippet listing available scenes for the planner. */
export function threeSceneCatalogForPrompt(): string {
  return THREE_SCENE_IDS.join(", ");
}
