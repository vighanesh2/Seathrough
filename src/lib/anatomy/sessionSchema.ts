import { z } from "zod";
import {
  anatomyAnimationModeSchema,
  anatomyStructureIdSchema,
} from "@/lib/anatomy/schemas";
import {
  SCENE_MODE_SETS,
  SCENE_STRUCTURES,
} from "@/lib/anatomy/registry";

const canonicalTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString());

const anatomyCitationSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(300),
    publisher: z.string().trim().min(1).max(200),
    url: z.string().url().max(2_000),
    excerpt: z.string().trim().min(1).max(4_000),
  })
  .strict();

const persistedAnatomyAnswerSchema = z
  .object({
    answer: z.string().trim().min(1).max(4_000),
    citations: z.array(anatomyCitationSchema).max(12),
    focusStructures: z.array(anatomyStructureIdSchema).max(8),
    animationMode: anatomyAnimationModeSchema,
    reveal: z.coerce.number().int().min(1).max(6),
    supported: z.boolean(),
  })
  .strict();

export const anatomySessionTurnSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    question: z.string().trim().min(1).max(600),
    answer: persistedAnatomyAnswerSchema.optional(),
    error: z.string().trim().min(1).max(1_000).optional(),
    createdAt: canonicalTimestampSchema,
  })
  .strict();

export const anatomySessionSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(80),
    sceneId: z.enum(["cardiopulmonary", "eye", "brain", "kidney"]),
    mode: anatomyAnimationModeSchema,
    reveal: z.coerce.number().int().min(1).max(6),
    selected: anatomyStructureIdSchema.nullable(),
    focused: z.array(anatomyStructureIdSchema).max(12),
    turns: z.array(anatomySessionTurnSchema).max(100),
    createdAt: canonicalTimestampSchema,
    updatedAt: canonicalTimestampSchema,
  })
  .strict()
  .superRefine((session, ctx) => {
    if (!SCENE_MODE_SETS[session.sceneId].includes(session.mode)) {
      ctx.addIssue({
        code: "custom",
        path: ["mode"],
        message: "Animation mode does not belong to this anatomy scene",
      });
    }
    const structureIds = new Set(
      SCENE_STRUCTURES[session.sceneId].map((structure) => structure.id),
    );
    if (session.selected && !structureIds.has(session.selected)) {
      ctx.addIssue({
        code: "custom",
        path: ["selected"],
        message: "Selected structure does not belong to this anatomy scene",
      });
    }
    session.focused.forEach((structure, index) => {
      if (!structureIds.has(structure)) {
        ctx.addIssue({
          code: "custom",
          path: ["focused", index],
          message: "Focused structure does not belong to this anatomy scene",
        });
      }
    });
  });

export const anatomySessionSyncSchema = z
  .object({
    session: anatomySessionSchema,
  })
  .strict();

export type PersistedAnatomySession = z.infer<typeof anatomySessionSchema>;
