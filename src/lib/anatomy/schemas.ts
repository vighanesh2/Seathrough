import { z } from "zod";
import {
  ANATOMY_ANIMATION_MODES,
  ANATOMY_STRUCTURE_IDS,
} from "@/lib/anatomy/types";

export const anatomyStructureIdSchema = z.enum(ANATOMY_STRUCTURE_IDS);
export const anatomyAnimationModeSchema = z.enum(ANATOMY_ANIMATION_MODES);

export const anatomyQuestionRequestSchema = z.object({
  question: z.string().trim().min(1).max(600),
  selectedStructure: anatomyStructureIdSchema.nullable().optional(),
  sceneMode: anatomyAnimationModeSchema.optional(),
});

export const anatomyModelAnswerSchema = z.object({
  answer: z.string().trim().min(1).max(4000),
  focusStructures: z.array(anatomyStructureIdSchema).max(8).default([]),
  animationMode: anatomyAnimationModeSchema.default("overview"),
  reveal: z.coerce.number().int().min(1).max(6).default(6),
  supported: z.boolean().default(true),
});
