import { z } from "zod";
import { boundingBoxSchema, topicIdSchema } from "@/lib/topics/schema";

export const catalogStepSchema = z.object({
  title: z.string().min(1).max(80),
  detail: z.string().min(1).max(500),
});

/**
 * One JSXGraph example as data. The `source` body receives `(JXG, board)` and
 * must not call `initBoard` — the host already created `board`.
 */
export const catalogEntrySchema = z.object({
  id: topicIdSchema,
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  formula: z.string().max(200).default(""),
  aliases: z.array(z.string().min(1).max(80)).min(1).max(40),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  boundingBox: boundingBoxSchema,
  keepAspectRatio: z.boolean().default(true),
  steps: z.array(catalogStepSchema).min(2).max(12),
  /** Attribution / upstream URL for humans; never fetched at runtime. */
  sourceUrl: z.string().url().optional(),
  /**
   * Construction body. Only loaded from the local generated catalog —
   * never from the network or the LLM.
   */
  source: z.string().min(1).max(50_000),
});

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;

export const catalogFileSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  entries: z.array(catalogEntrySchema).max(500),
});

export type CatalogFile = z.infer<typeof catalogFileSchema>;
