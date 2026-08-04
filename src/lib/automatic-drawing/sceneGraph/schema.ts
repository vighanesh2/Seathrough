import { z } from "zod";

const pointSchema = z
  .array(z.number())
  .length(2)
  .transform((p) => [p[0]!, p[1]!] as [number, number]);

const styleSchema = z.enum([
  "outline",
  "outline-bold",
  "outline-fine",
  "detail",
  "hatching",
  "crosshatch",
  "sketch",
  "gesture",
  "underdrawing",
  "soft",
  "wash",
  "scumble",
  "texture",
  "accent",
  "highlight",
  "construction",
]);

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);

export const strokeNodeSchema = z.object({
  name: z.string().min(1).max(64),
  type: z.literal("stroke"),
  layer: z.coerce.number().int().min(0).max(12).default(2),
  style: styleSchema.default("outline"),
  color: hexColor.default("#1a1a1a"),
  weight: z.coerce.number().min(0.3).max(3).default(1),
  points: z.array(pointSchema).min(2).max(32),
});

export const fillNodeSchema = z.object({
  name: z.string().min(1).max(64),
  type: z.literal("fill"),
  layer: z.coerce.number().int().min(0).max(12).default(0),
  color: hexColor.default("#c8d6e5"),
  opacity: z.coerce.number().min(0.04).max(0.85).default(0.35),
  points: z.array(pointSchema).min(3).max(24),
});

export type SceneStrokeNode = z.infer<typeof strokeNodeSchema>;
export type SceneFillNode = z.infer<typeof fillNodeSchema>;
export type SceneComponentNode = {
  name: string;
  type: "component";
  children: SceneNode[];
};
export type SceneNode = SceneStrokeNode | SceneFillNode | SceneComponentNode;

export const componentNodeSchema: z.ZodType<SceneComponentNode> = z.lazy(() =>
  z.object({
    name: z.string().min(1).max(64),
    type: z.literal("component"),
    children: z.array(sceneNodeSchema).min(1).max(40),
  }),
);

export const sceneNodeSchema: z.ZodType<SceneNode> = z.lazy(() =>
  z.union([strokeNodeSchema, fillNodeSchema, componentNodeSchema]),
);

export const sceneGraphSchema = z.object({
  name: z.string().min(1).max(80).default("Scene"),
  version: z.string().default("1.0"),
  mode: z.enum(["draw", "design"]).default("draw"),
  background: hexColor.optional(),
  canvas: z
    .object({
      width: z.coerce.number().min(320).max(1600).default(900),
      height: z.coerce.number().min(240).max(1200).default(600),
    })
    .default({ width: 900, height: 600 }),
  root: componentNodeSchema,
});

export type SceneGraph = z.infer<typeof sceneGraphSchema>;

/** Count leaf stroke/fill nodes for soft limits. */
export function countLeaves(node: SceneNode): number {
  if (node.type === "component") {
    return node.children.reduce((n, c) => n + countLeaves(c), 0);
  }
  return 1;
}
