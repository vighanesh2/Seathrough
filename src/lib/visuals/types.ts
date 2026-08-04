import { z } from "zod";
import { sceneRecipeSchema } from "@/lib/schemas/sceneRecipe";
import { boardScriptSchema } from "@/lib/schemas/boardScript";

export const visualRendererSchema = z.enum([
  "template",
  "mermaid",
  "mafs",
  "katex",
  "rough",
  "icon",
  "board_script",
]);

export type VisualRenderer = z.infer<typeof visualRendererSchema>;

export const visualActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("draw"),
    pathIds: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("highlight"),
    anchor: z.string().min(1),
  }),
  z.object({
    type: z.literal("arrow"),
    fromAnchor: z.string().min(1),
    toAnchor: z.string().optional(),
    direction: z.enum(["up", "down", "left", "right"]).optional(),
    label: z.string().optional(),
  }),
  z.object({
    type: z.literal("label"),
    anchor: z.string().min(1),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal("write"),
    text: z.string().min(1),
    x: z.number().optional(),
    y: z.number().optional(),
  }),
  z.object({
    type: z.literal("clear"),
  }),
]);

export type VisualAction = z.infer<typeof visualActionSchema>;

export const visualPlanSchema = z.object({
  renderer: visualRendererSchema,
  assetId: z.string().optional(),
  /** Mermaid source, KaTeX expression, or Mafs mode */
  source: z.string().optional(),
  /**
   * Optional equation shown WITH a figure (template / mafs / rough / board_script).
   */
  formula: z.string().optional(),
  /** Rough.js scene when renderer is "rough" */
  sceneRecipe: sceneRecipeSchema.optional(),
  /** Progressive pen lesson when renderer is "board_script" */
  boardScript: boardScriptSchema.optional(),
  actions: z.array(visualActionSchema).default([]),
});

export type VisualPlan = z.infer<typeof visualPlanSchema>;

export type AnchorPoint = {
  x: number;
  y: number;
  preferredLabelSide: "top" | "right" | "bottom" | "left";
};

export type VisualPath = {
  id: string;
  d: string;
  drawOrder: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
};

/** Curated lesson illustration — AI uses anchors, never raw pixels for labels */
export type VisualAsset = {
  id: string;
  title: string;
  viewBox: string;
  paths: VisualPath[];
  anchors: Record<string, AnchorPoint>;
  tags: string[];
};
