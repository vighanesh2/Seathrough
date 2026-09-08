import { z } from "zod";

export const lessonMcqSchema = z.object({
  question: z.string().trim().min(8).max(280),
  options: z
    .array(z.string().trim().min(1).max(160))
    .length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(8).max(320),
});

export type LessonMcq = z.infer<typeof lessonMcqSchema>;
