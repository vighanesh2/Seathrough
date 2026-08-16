import { z } from "zod";
import { ALGO_PATTERNS } from "@/lib/leetcode/types";

export const algoPatternSchema = z.enum(ALGO_PATTERNS);

export const leetcodeVisualizeRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
});

export const algoClassifyModelSchema = z.object({
  pattern: algoPatternSchema,
  title: z.string().trim().min(1).max(120).default("Algorithm"),
  summary: z.string().trim().min(1).max(400).default(""),
  nums: z.array(z.coerce.number()).max(40).optional(),
  text: z.string().trim().max(200).optional(),
  target: z.coerce.number().optional(),
  supported: z.boolean().default(true),
});

export type AlgoClassifyModel = z.infer<typeof algoClassifyModelSchema>;
