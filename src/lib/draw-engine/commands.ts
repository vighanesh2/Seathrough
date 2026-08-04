import { z } from "zod";

/** Logical board the planner targets — client scales to Stage size. */
export const DRAW_CANVAS_WIDTH = 900;
export const DRAW_CANVAS_HEIGHT = 600;

const colorSchema = z.string().trim().min(1).max(64).optional();

const pointSchema = z.object({
  x: z.coerce.number(),
  y: z.coerce.number(),
});

const timingFields = {
  /** Absolute ms from session/stream clock start. */
  t0: z.coerce.number().min(0),
  /** How long the client should animate this command. */
  durationMs: z.coerce.number().min(0).max(30_000).default(600),
  id: z.string().min(1).max(64),
};

export const strokeCmdSchema = z.object({
  type: z.literal("stroke"),
  ...timingFields,
  points: z.array(pointSchema).min(2).max(120),
  color: colorSchema,
  width: z.coerce.number().min(1).max(16).default(3),
  closed: z.boolean().optional(),
  jitter: z.coerce.number().min(0).max(4).optional(),
});

export const lineCmdSchema = z.object({
  type: z.literal("line"),
  ...timingFields,
  x1: z.coerce.number(),
  y1: z.coerce.number(),
  x2: z.coerce.number(),
  y2: z.coerce.number(),
  color: colorSchema,
  width: z.coerce.number().min(1).max(16).default(3),
});

export const arrowCmdSchema = z.object({
  type: z.literal("arrow"),
  ...timingFields,
  x1: z.coerce.number(),
  y1: z.coerce.number(),
  x2: z.coerce.number(),
  y2: z.coerce.number(),
  color: colorSchema,
  width: z.coerce.number().min(1).max(16).default(3),
});

export const rectCmdSchema = z.object({
  type: z.literal("rect"),
  ...timingFields,
  x: z.coerce.number(),
  y: z.coerce.number(),
  w: z.coerce.number().positive().max(DRAW_CANVAS_WIDTH),
  h: z.coerce.number().positive().max(DRAW_CANVAS_HEIGHT),
  color: colorSchema,
  width: z.coerce.number().min(1).max(16).default(3),
  fill: colorSchema,
});

export const circleCmdSchema = z.object({
  type: z.literal("circle"),
  ...timingFields,
  x: z.coerce.number(),
  y: z.coerce.number(),
  radius: z.coerce.number().positive().max(400),
  color: colorSchema,
  width: z.coerce.number().min(1).max(16).default(3),
  fill: colorSchema,
});

export const textCmdSchema = z.object({
  type: z.literal("text"),
  ...timingFields,
  text: z.string().min(1).max(120),
  x: z.coerce.number(),
  y: z.coerce.number(),
  color: colorSchema,
  fontSize: z.coerce.number().min(12).max(48).default(20),
});

export const imageCmdSchema = z.object({
  type: z.literal("image"),
  ...timingFields,
  x: z.coerce.number(),
  y: z.coerce.number(),
  w: z.coerce.number().positive().max(DRAW_CANVAS_WIDTH),
  h: z.coerce.number().positive().max(DRAW_CANVAS_HEIGHT),
  /** data:image/...;base64,... or https URL */
  src: z.string().min(1).max(6_000_000),
});

export const highlightCmdSchema = z.object({
  type: z.literal("highlight"),
  ...timingFields,
  x: z.coerce.number(),
  y: z.coerce.number(),
  w: z.coerce.number().positive(),
  h: z.coerce.number().positive(),
  color: colorSchema,
});

export const pauseCmdSchema = z.object({
  type: z.literal("pause"),
  ...timingFields,
  durationMs: z.coerce.number().min(0).max(30_000).default(400),
});

export const clearCmdSchema = z.object({
  type: z.literal("clear"),
  t0: z.coerce.number().min(0),
  durationMs: z.coerce.number().min(0).max(1000).default(0),
  id: z.string().min(1).max(64),
});

export const drawCommandSchema = z.discriminatedUnion("type", [
  strokeCmdSchema,
  lineCmdSchema,
  arrowCmdSchema,
  rectCmdSchema,
  circleCmdSchema,
  textCmdSchema,
  imageCmdSchema,
  highlightCmdSchema,
  pauseCmdSchema,
  clearCmdSchema,
]);

export const drawCommandListSchema = z.array(drawCommandSchema).max(200);

export type DrawCommand = z.infer<typeof drawCommandSchema>;
export type StrokeCommand = z.infer<typeof strokeCmdSchema>;

/** SSE payload for the client draw engine. */
export type DrawStreamEvent =
  | {
      type: "session_start";
      title: string;
      canvas: { width: number; height: number };
      /** Optional wall-clock offset; client usually uses receive time. */
      serverTimeMs?: number;
    }
  | { type: "cmd"; command: DrawCommand }
  | { type: "cmds"; commands: DrawCommand[] }
  | {
      type: "speak";
      text: string;
      /** When speech should start on the same clock (ms). */
      t0: number;
      /** Reserved for Deepgram word alignment later. */
      words?: Array<{ word: string; startMs: number; endMs: number }>;
    }
  | { type: "done" }
  | { type: "error"; message: string };
