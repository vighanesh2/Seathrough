import { z } from "zod";

/** Drawing recipe the local Rough.js renderer can paint — not an image prompt. */
export const sceneRecipeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("polygon"),
    sides: z.number().int().min(3).max(12),
    label: z.string().min(1),
    note: z.string().optional(),
  }),
  z.object({
    kind: z.literal("circle"),
    label: z.string().min(1),
    showRadius: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("line"),
    label: z.string().min(1),
  }),
  z.object({
    kind: z.literal("stack"),
    label: z.string().min(1),
    layers: z.array(z.string()).max(6).optional(),
  }),
  z.object({
    kind: z.literal("cycle"),
    label: z.string().min(1),
  }),
  z.object({
    kind: z.literal("tree"),
    label: z.string().min(1),
  }),
  z.object({
    kind: z.literal("metaphor"),
    template: z.enum(["classroom", "conveyor"]),
    label: z.string().min(1),
  }),
  z.object({
    kind: z.literal("concept"),
    label: z.string().min(1),
    note: z.string().optional(),
  }),
]);

export type SceneRecipe = z.infer<typeof sceneRecipeSchema>;

export function coerceSceneRecipe(value: unknown): SceneRecipe | undefined {
  const parsed = sceneRecipeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function recipeBadge(recipe: SceneRecipe): string {
  if (recipe.kind === "polygon") {
    return polygonName(recipe.sides);
  }
  if (recipe.kind === "metaphor") return recipe.template;
  return recipe.kind;
}

export function polygonName(sides: number): string {
  const names: Record<number, string> = {
    3: "triangle",
    4: "square",
    5: "pentagon",
    6: "hexagon",
    7: "heptagon",
    8: "octagon",
    9: "nonagon",
    10: "decagon",
  };
  return names[sides] ?? `${sides}-gon`;
}
