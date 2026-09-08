import { z } from "zod";
import {
  boardActionsSchema,
  coerceBoardActions,
} from "@/lib/schemas/boardActions";
import { boardScriptSchema } from "@/lib/schemas/boardScript";
import {
  coerceSceneRecipe,
  sceneRecipeSchema,
} from "@/lib/schemas/sceneRecipe";
import {
  visualActionSchema,
  visualPlanSchema,
  visualRendererSchema,
} from "@/lib/visuals/types";

export const cognitiveTypeSchema = z.enum([
  "definition",
  "structural",
  "process",
  "hidden_state",
]);

export const beatKindSchema = z.enum([
  "intro",
  "token",
  "visual_shift",
  "recap",
  "human_summary",
]);

export const diagramActionSchema = z.enum([
  "none",
  "generate",
  "keep",
  "retire",
]);

export const sceneShapeSchema = z.enum([
  "classroom",
  "cycle",
  "stack",
  "tree",
  "circle",
  "square",
  "triangle",
  "line",
  "blank",
  "custom",
]);

const BEAT_KIND_ALIASES: Record<string, z.infer<typeof beatKindSchema>> = {
  intro: "intro",
  introduction: "intro",
  overview: "intro",
  concept: "intro",
  definition: "intro",
  explain: "intro",
  explanation: "intro",
  token: "token",
  code: "token",
  syntax: "token",
  keyword: "token",
  step: "token",
  visual_shift: "visual_shift",
  visual: "visual_shift",
  diagram: "visual_shift",
  metaphor: "visual_shift",
  sketch: "visual_shift",
  recap: "recap",
  summary: "recap",
  conclude: "recap",
  conclusion: "recap",
  human_summary: "human_summary",
  mental_model: "human_summary",
  takeaway: "human_summary",
};

const COGNITIVE_ALIASES: Record<string, z.infer<typeof cognitiveTypeSchema>> = {
  definition: "definition",
  semantic: "definition",
  structural: "structural",
  structure: "structural",
  relational: "structural",
  process: "process",
  procedural: "process",
  temporal: "process",
  hidden_state: "hidden_state",
  hidden: "hidden_state",
  memory: "hidden_state",
};

const ACTION_ALIASES: Record<string, z.infer<typeof diagramActionSchema>> = {
  none: "none",
  skip: "none",
  generate: "generate",
  draw: "generate",
  show: "generate",
  create: "generate",
  keep: "keep",
  hold: "keep",
  retire: "retire",
  clear: "retire",
};

function coerceBeatKind(value: unknown) {
  if (typeof value !== "string") return "intro";
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  // Unknown labels must not fail the lesson — fall back to token
  return BEAT_KIND_ALIASES[key] ?? "token";
}

function coerceCognitiveType(value: unknown) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  // Drop unknown values so Trigger can infer
  return COGNITIVE_ALIASES[key];
}

function coerceDiagramAction(value: unknown) {
  if (value == null || value === "") return "none";
  if (typeof value !== "string") return "none";
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ACTION_ALIASES[key] ?? "none";
}

function coerceSceneShape(value: unknown) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, z.infer<typeof sceneShapeSchema>> = {
    classroom: "classroom",
    blueprint: "classroom",
    class: "classroom",
    cycle: "cycle",
    loop: "cycle",
    stack: "stack",
    tree: "tree",
    binary_tree: "tree",
    circle: "circle",
    round: "circle",
    square: "square",
    rectangle: "square",
    rect: "square",
    triangle: "triangle",
    line: "line",
    segment: "line",
    blank: "blank",
    custom: "custom",
    // Drawn via sceneRecipe polygons; badge shape stays custom
    pentagon: "custom",
    hexagon: "custom",
    heptagon: "custom",
    octagon: "custom",
    polygon: "custom",
  };
  return aliases[key];
}

export const lessonBeatSchema = z.object({
  id: z.string().min(1),
  order: z.coerce.number().int().positive(),
  kind: z.preprocess(coerceBeatKind, beatKindSchema),
  codeDelta: z.string().optional(),
  highlight: z.string().optional(),
  narration: z.string().min(1),
  metaphorKey: z.string().optional(),
  conceptKey: z.string().optional(),
  cognitiveType: z.preprocess(
    coerceCognitiveType,
    cognitiveTypeSchema.optional(),
  ),
  sceneShape: z.preprocess(coerceSceneShape, sceneShapeSchema.optional()),
  sceneRecipe: z.preprocess((value) => {
    if (value == null || value === "") return undefined;
    return coerceSceneRecipe(value);
  }, sceneRecipeSchema.optional()),
  /** Konva/legacy board actions — optional */
  actions: z.preprocess((value) => {
    if (value == null) return [];
    return coerceBoardActions(value);
  }, boardActionsSchema.default([])),
  /** Doc-style visual plan: renderer + asset + anchor actions */
  visual: z.preprocess((value) => {
    if (value == null || value === "") return undefined;
    if (typeof value !== "object") return undefined;
    const raw = value as Record<string, unknown>;
    const renderer = visualRendererSchema.safeParse(raw.renderer);
    if (!renderer.success) return undefined;
    const actionsRaw = Array.isArray(raw.actions) ? raw.actions : [];
    const actions = actionsRaw
      .map((a) => visualActionSchema.safeParse(a))
      .filter((r) => r.success)
      .map((r) => r.data);
    const sceneRecipe =
      raw.sceneRecipe != null ? coerceSceneRecipe(raw.sceneRecipe) : undefined;
    const boardScriptParse =
      raw.boardScript != null
        ? boardScriptSchema.safeParse(raw.boardScript)
        : null;
    return {
      renderer: renderer.data,
      assetId: typeof raw.assetId === "string" ? raw.assetId : undefined,
      source: typeof raw.source === "string" ? raw.source : undefined,
      formula: typeof raw.formula === "string" ? raw.formula : undefined,
      sceneRecipe,
      boardScript:
        boardScriptParse && boardScriptParse.success
          ? boardScriptParse.data
          : undefined,
      actions,
    };
  }, visualPlanSchema.optional()),
  imageAction: z.preprocess(coerceDiagramAction, diagramActionSchema),
  imagePrompt: z.string().optional(),
  paceHintMs: z.coerce.number().int().positive().max(20_000).optional(),
  pedagogyNote: z.string().optional(),
});

export const lessonPlanSchema = z.object({
  title: z.string().min(1),
  language: z.string().min(1).default("general"),
  beats: z.array(lessonBeatSchema).min(1).max(40),
  humanSummary: z.string().min(1),
  sources: z
    .array(
      z.object({
        id: z.string().min(1).max(20),
        title: z.string().min(1).max(240),
        url: z.string().url(),
        publisher: z.string().min(1).max(120),
        excerpt: z.string().max(800),
      }),
    )
    .max(8)
    .optional(),
  /**
   * Planner preference for interactive Three.js. The scene resolver may apply
   * narrow safety fallbacks when a supported anatomy lesson was omitted.
   */
  threeScene: z
    .preprocess((value) => {
      if (value == null || value === false || value === "") return null;
      if (value === true) return { use: true, id: "generic" };
      if (typeof value !== "object") return null;
      const raw = value as Record<string, unknown>;
      const use =
        raw.use === true ||
        raw.enabled === true ||
        raw.show === true ||
        String(raw.use).toLowerCase() === "true";
      if (!use) return { use: false };
      return {
        use: true,
        id: typeof raw.id === "string" ? raw.id : undefined,
        title: typeof raw.title === "string" ? raw.title : undefined,
      };
    }, z
      .object({
        use: z.boolean(),
        id: z.string().optional(),
        title: z.string().optional(),
      })
      .nullable()
      .optional()),
});

export type LessonPlanParsed = z.infer<typeof lessonPlanSchema>;
export type LessonBeatParsed = z.infer<typeof lessonBeatSchema>;
export type CognitiveType = z.infer<typeof cognitiveTypeSchema>;
export type SceneShape = z.infer<typeof sceneShapeSchema>;
