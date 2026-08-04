import { z } from "zod";

const colorSchema = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  .default("#1a2b3c");

const widthSchema = z.coerce.number().min(1).max(16).default(3);

export const autoStrokeSchema = z.object({
  color: colorSchema,
  width: widthSchema,
  /** Flat [x1,y1,x2,y2,...] in plan coordinates */
  points: z
    .array(z.number())
    .min(4)
    .refine((pts) => pts.length % 2 === 0, "points must be pairs"),
});

export const autoLineSchema = z.object({
  type: z.literal("line"),
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  color: colorSchema,
  width: widthSchema,
});

export const autoCircleSchema = z.object({
  type: z.literal("circle"),
  x: z.number(),
  y: z.number(),
  radius: z.coerce.number().min(4).max(300),
  color: colorSchema,
  width: widthSchema,
});

export const autoRectSchema = z.object({
  type: z.literal("rect"),
  x: z.number(),
  y: z.number(),
  w: z.coerce.number().min(4).max(800),
  h: z.coerce.number().min(4).max(600),
  color: colorSchema,
  width: widthSchema,
});

export const autoPolySchema = z.object({
  type: z.literal("stroke"),
  color: colorSchema,
  width: widthSchema,
  points: z
    .array(z.number())
    .min(4)
    .refine((pts) => pts.length % 2 === 0, "points must be pairs"),
});

export const autoTextSchema = z.object({
  type: z.literal("text"),
  x: z.number(),
  y: z.number(),
  text: z.string().trim().min(1).max(40),
  color: colorSchema,
  fontSize: z.coerce.number().min(12).max(48).default(18),
});

export const autoCommandSchema = z.discriminatedUnion("type", [
  autoPolySchema,
  autoLineSchema,
  autoCircleSchema,
  autoRectSchema,
  autoTextSchema,
]);

export const whiteboardPlanSchema = z.object({
  title: z.string().trim().min(1).max(120).default("Drawing"),
  width: z.coerce.number().min(320).max(1600).default(900),
  height: z.coerce.number().min(240).max(1200).default(600),
  commands: z.array(autoCommandSchema).min(1).max(60),
});

export type AutoCommand = z.infer<typeof autoCommandSchema>;
export type WhiteboardPlan = z.infer<typeof whiteboardPlanSchema>;

/** Canvas-ready stroke used by our whiteboard player. */
export type PlayableStroke = {
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
  /** When true, treat points as a closed filled polygon. */
  fill?: boolean;
  text?: { content: string; fontSize: number };
};

function sampleCircle(
  cx: number,
  cy: number,
  r: number,
  segments = 48,
): number[] {
  const pts: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    pts.push(cx + Math.cos(t) * r, cy + Math.sin(t) * r);
  }
  return pts;
}

function flatToPoints(flat: number[]): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    out.push({ x: flat[i]!, y: flat[i + 1]! });
  }
  return out;
}

export function commandToPlayable(cmd: AutoCommand): PlayableStroke {
  switch (cmd.type) {
    case "stroke":
      return {
        color: cmd.color,
        width: cmd.width,
        points: flatToPoints(cmd.points),
      };
    case "line":
      return {
        color: cmd.color,
        width: cmd.width,
        points: [
          { x: cmd.x1, y: cmd.y1 },
          { x: cmd.x2, y: cmd.y2 },
        ],
      };
    case "circle":
      return {
        color: cmd.color,
        width: cmd.width,
        points: flatToPoints(sampleCircle(cmd.x, cmd.y, cmd.radius)),
      };
    case "rect":
      return {
        color: cmd.color,
        width: cmd.width,
        points: [
          { x: cmd.x, y: cmd.y },
          { x: cmd.x + cmd.w, y: cmd.y },
          { x: cmd.x + cmd.w, y: cmd.y + cmd.h },
          { x: cmd.x, y: cmd.y + cmd.h },
          { x: cmd.x, y: cmd.y },
        ],
      };
    case "text":
      return {
        color: cmd.color,
        width: 1,
        points: [{ x: cmd.x, y: cmd.y }],
        text: { content: cmd.text, fontSize: cmd.fontSize },
      };
  }
}

export function planToPlayable(plan: WhiteboardPlan): PlayableStroke[] {
  return plan.commands.map(commandToPlayable);
}

/** Scale plan coords into the live canvas CSS size, keeping aspect fit. */
export function scalePlayableToCanvas(
  strokes: PlayableStroke[],
  planW: number,
  planH: number,
  canvasW: number,
  canvasH: number,
  margin = 24,
): PlayableStroke[] {
  const availW = Math.max(1, canvasW - margin * 2);
  const availH = Math.max(1, canvasH - margin * 2);
  const scale = Math.min(availW / planW, availH / planH);
  const offsetX = (canvasW - planW * scale) / 2;
  const offsetY = (canvasH - planH * scale) / 2;

  return strokes.map((s) => ({
    ...s,
    fill: s.fill,
    width: Math.max(1.5, s.width * scale),
    points: s.points.map((p) => ({
      x: offsetX + p.x * scale,
      y: offsetY + p.y * scale,
    })),
    text: s.text
      ? {
          ...s.text,
          fontSize: Math.max(12, s.text.fontSize * scale),
        }
      : undefined,
  }));
}
