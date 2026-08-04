import { z } from "zod";

const umlClassSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(40),
  attributes: z.array(z.string().max(48)).max(6).default([]),
  methods: z.array(z.string().max(48)).max(6).default([]),
  x: z.coerce.number().min(40).max(820),
  y: z.coerce.number().min(50).max(480),
  /** Beat order when this class should first appear (1-based). */
  revealBeat: z.coerce.number().int().min(1).max(20),
});

const umlRelationshipSchema = z.object({
  id: z.string().min(1).max(40),
  from: z.string().min(1).max(40),
  to: z.string().min(1).max(40),
  kind: z.enum([
    "inheritance",
    "association",
    "aggregation",
    "composition",
    "dependency",
  ]),
  label: z.string().max(32).optional(),
  revealBeat: z.coerce.number().int().min(1).max(20),
});

const umlActorSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(24),
  x: z.coerce.number().min(60).max(840),
  revealBeat: z.coerce.number().int().min(1).max(20),
});

const umlMessageSchema = z.object({
  id: z.string().min(1).max(40),
  from: z.string().min(1).max(40),
  to: z.string().min(1).max(40),
  label: z.string().min(1).max(40),
  y: z.coerce.number().min(120).max(420),
  revealBeat: z.coerce.number().int().min(1).max(20),
});

export const umlDiagramPlanSchema = z.object({
  title: z.string().min(1).max(80),
  kind: z.enum(["class", "sequence"]),
  domain: z.string().min(1).max(48),
  classes: z.array(umlClassSchema).max(8).default([]),
  relationships: z.array(umlRelationshipSchema).max(12).default([]),
  actors: z.array(umlActorSchema).max(6).default([]),
  messages: z.array(umlMessageSchema).max(12).default([]),
});

export type UmlDiagramPlan = z.infer<typeof umlDiagramPlanSchema>;
export type UmlClassNode = z.infer<typeof umlClassSchema>;
export type UmlRelationship = z.infer<typeof umlRelationshipSchema>;

/** True when the lesson should pre-generate a full UML JSON plan. */
export function shouldGenerateUmlPlan(prompt: string): boolean {
  const p = prompt.toLowerCase();
  if (
    /\buml\b/.test(p) ||
    /\bclass\s+diagram\b/.test(p) ||
    /\bsequence\s+diagram\b/.test(p)
  ) {
    return true;
  }
  // Domain modeling lessons that imply class structure.
  if (
    /\b(inheritance|association|aggregation|composition|oop|object[- ]oriented)\b/.test(
      p,
    ) &&
    /\b(diagram|design|model|class|classes)\b/.test(p)
  ) {
    return true;
  }
  return (
    /\b(class|classes)\b/.test(p) &&
    /\b(diagram|design|model)\b/.test(p)
  );
}
