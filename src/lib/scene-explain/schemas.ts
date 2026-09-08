import { z } from "zod";

export const sceneGenerateRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(600),
  priorTitle: z.string().trim().max(80).optional(),
  priorSummary: z.string().trim().max(800).optional(),
});

export const sceneRepairRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(600),
  title: z.string().trim().min(1).max(80),
  code: z.string().trim().min(1).max(60_000),
  error: z.string().trim().min(1).max(1200),
  attempt: z.coerce.number().int().min(1).max(6).default(1),
});

export const sceneSpeakRequestSchema = z.object({
  text: z.string().trim().min(1).max(900),
});
