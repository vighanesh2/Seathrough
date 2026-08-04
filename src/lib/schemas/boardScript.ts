import { z } from "zod";

/**
 * Ordered teacher-board steps for unknown topics.
 * Semantic only — no pixel coordinates, no executable code.
 */
export const boardScriptStepSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("write"),
    id: z.string().min(1).max(32).optional(),
    text: z.string().min(1).max(120),
    style: z.enum(["plain", "equation", "emphasis"]).optional(),
    /** When set, this step appears on/after this lesson beat order */
    beat: z.number().int().positive().max(40).optional(),
  }),
  z.object({
    type: z.literal("arrow"),
    id: z.string().min(1).max(32).optional(),
    label: z.string().max(60).optional(),
    beat: z.number().int().positive().max(40).optional(),
  }),
  z.object({
    type: z.literal("box"),
    id: z.string().min(1).max(32).optional(),
    /** Box the write step with this id; defaults to latest write */
    targetId: z.string().min(1).max(32).optional(),
    text: z.string().max(120).optional(),
    beat: z.number().int().positive().max(40).optional(),
  }),
  z.object({
    type: z.literal("cross_out"),
    id: z.string().min(1).max(32).optional(),
    targetId: z.string().min(1).max(32).optional(),
    beat: z.number().int().positive().max(40).optional(),
  }),
  z.object({
    type: z.literal("note"),
    id: z.string().min(1).max(32).optional(),
    text: z.string().min(1).max(160),
    beat: z.number().int().positive().max(40).optional(),
  }),
  z.object({
    type: z.literal("pause"),
    ms: z.number().int().min(0).max(2000).optional(),
    beat: z.number().int().positive().max(40).optional(),
  }),
]);

export const boardScriptSchema = z.object({
  title: z.string().max(80).optional(),
  misconception: z.string().max(160).optional(),
  steps: z.array(boardScriptStepSchema).min(2).max(12),
});

export type BoardScriptStep = z.infer<typeof boardScriptStepSchema>;
export type BoardScript = z.infer<typeof boardScriptSchema>;

export const visualAnalysisSchema = z.object({
  teachingGoal: z.string().min(1).max(200),
  misconception: z.string().max(160).optional(),
  visualStrategy: z.enum([
    "equation_transform",
    "definition_steps",
    "compare",
    "process",
    "example_work",
  ]),
  example: z
    .object({
      expression: z.string().max(80).optional(),
      result: z.string().max(40).optional(),
    })
    .optional(),
  boardScript: boardScriptSchema,
});

export type VisualAnalysis = z.infer<typeof visualAnalysisSchema>;
