import { z } from "zod";
import { IMAGE_EXPLAIN_KINDS } from "@/lib/image-explain/types";

export const imageExplainKindSchema = z.enum(IMAGE_EXPLAIN_KINDS);

export const imageExtractionModelSchema = z.object({
  kind: imageExplainKindSchema.default("other"),
  title: z.string().trim().min(1).max(120).default("Screenshot"),
  text: z.string().trim().min(1).max(12_000),
  blocks: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(2000),
        label: z.string().trim().max(80).optional(),
      }),
    )
    .max(40)
    .default([]),
  confidence: z.coerce.number().min(0).max(1).optional(),
});

export const imageExplanationModelSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(2000),
  steps: z.array(z.string().trim().min(1).max(600)).min(1).max(12),
  concepts: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  followUps: z.array(z.string().trim().min(1).max(160)).max(6).default([]),
});

export type ImageExtractionModel = z.infer<typeof imageExtractionModelSchema>;
export type ImageExplanationModel = z.infer<typeof imageExplanationModelSchema>;
