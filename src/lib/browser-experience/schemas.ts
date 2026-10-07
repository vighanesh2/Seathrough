import { z } from "zod";

export const annotationSchema = z.object({
  kind: z.enum([
    "highlight",
    "circle",
    "clear",
    "click",
    "youtube_play",
    "youtube_pause",
    "youtube_seek",
  ]),
  text: z.string().max(400).optional(),
  selector: z.string().max(300).optional(),
  label: z.string().max(160).optional(),
  seconds: z.number().min(0).max(60 * 60 * 6).optional(),
});

export const teachBeatSchema = z.object({
  id: z.string().min(1).max(40),
  speech: z.string().min(1).max(500),
  annotation: annotationSchema,
  holdMs: z.number().int().min(0).max(20_000).optional(),
});

export const teachPlanSchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(600),
  beats: z.array(teachBeatSchema).min(1).max(12),
});

export type TeachPlanParsed = z.infer<typeof teachPlanSchema>;

export const askBodySchema = z.object({
  prompt: z.string().min(1).max(800),
  sessionId: z.string().min(1).max(80).optional(),
});

export const followUpBodySchema = z.object({
  sessionId: z.string().min(1).max(80),
  prompt: z.string().min(1).max(800),
});

export const annotateBodySchema = z.object({
  sessionId: z.string().min(1).max(80),
  annotation: annotationSchema,
});

export const sessionBodySchema = z.object({
  sessionId: z.string().min(1).max(80).optional(),
});
