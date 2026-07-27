import { z } from "zod";
import { resolveIconName } from "@/lib/diagrams/iconLibrary";

/** Logical whiteboard size — AI places icons/labels in this space. */
export const BOARD_WIDTH = 480;
export const BOARD_HEIGHT = 320;

const pointPairSchema = z.union([
  z.tuple([z.number(), z.number()]),
  z
    .object({ x: z.number(), y: z.number() })
    .transform((p) => [p.x, p.y] as [number, number]),
]);

const iconActionSchema = z.object({
  type: z.literal("icon"),
  id: z.string().min(1),
  /** Tabler icon name, e.g. "car" or "tabler:car" */
  icon: z.string().min(1),
  x: z.coerce.number(),
  y: z.coerce.number(),
  size: z.coerce.number().min(24).max(220).optional(),
  color: z.string().optional(),
  animate: z.boolean().optional(),
});

const writeActionSchema = z.object({
  type: z.literal("write"),
  id: z.string().optional(),
  text: z.string().min(1).max(80),
  x: z.coerce.number(),
  y: z.coerce.number(),
  color: z.string().optional(),
  fontSize: z.number().positive().max(48).optional(),
});

const arrowActionSchema = z.object({
  type: z.literal("arrow"),
  id: z.string().optional(),
  from: pointPairSchema,
  to: pointPairSchema,
  color: z.string().optional(),
});

const highlightActionSchema = z.object({
  type: z.literal("highlight"),
  id: z.string().optional(),
  x: z.coerce.number(),
  y: z.coerce.number(),
  width: z.coerce.number().positive().max(BOARD_WIDTH),
  height: z.coerce.number().positive().max(BOARD_HEIGHT),
  color: z.string().optional(),
});

const clearActionSchema = z.object({
  type: z.literal("clear"),
});

/** Legacy freehand — kept for coercion; renderer treats as thin guide strokes only */
const strokeActionSchema = z.object({
  type: z.literal("stroke"),
  id: z.string().min(1),
  points: z.array(pointPairSchema).min(2).max(80),
  color: z.string().optional(),
  width: z.number().positive().max(12).optional(),
  closed: z.boolean().optional(),
});

export const boardActionSchema = z.discriminatedUnion("type", [
  iconActionSchema,
  writeActionSchema,
  arrowActionSchema,
  highlightActionSchema,
  clearActionSchema,
  strokeActionSchema,
]);

export const boardActionsSchema = z.array(boardActionSchema).max(40);

export type BoardAction = z.infer<typeof boardActionSchema>;
export type IconAction = z.infer<typeof iconActionSchema>;
export type WriteAction = z.infer<typeof writeActionSchema>;
export type ArrowAction = z.infer<typeof arrowActionSchema>;
export type HighlightAction = z.infer<typeof highlightActionSchema>;
export type StrokeAction = z.infer<typeof strokeActionSchema>;

export function coerceBoardActions(value: unknown): BoardAction[] {
  if (!Array.isArray(value)) return [];
  const out: BoardAction[] = [];
  for (const raw of value) {
    const normalized = normalizeRawAction(raw);
    const parsed = boardActionSchema.safeParse(normalized);
    if (!parsed.success) continue;

    if (parsed.data.type === "icon") {
      const icon = resolveIconName(parsed.data.icon);
      if (!icon) continue;
      out.push({ ...parsed.data, icon });
    } else {
      out.push(parsed.data);
    }
  }
  return out;
}

function normalizeRawAction(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const action = { ...(raw as Record<string, unknown>) };
  const type = String(action.type ?? "")
    .trim()
    .toLowerCase();

  if (
    type === "icon" ||
    type === "asset" ||
    type === "svg" ||
    type === "image"
  ) {
    action.type = "icon";
    if (typeof action.id !== "string" || !action.id.trim()) {
      action.id = `icon-${Math.random().toString(36).slice(2, 7)}`;
    }
    if (action.icon == null && action.name != null) action.icon = action.name;
    if (action.icon == null && action.iconName != null) {
      action.icon = action.iconName;
    }
  } else if (type === "write" || type === "text" || type === "label") {
    action.type = "write";
    if (typeof action.text !== "string") action.text = String(action.text ?? "");
  } else if (type === "arrow" || type === "line-arrow") {
    action.type = "arrow";
    action.from = normalizePoint(action.from);
    action.to = normalizePoint(action.to);
  } else if (type === "highlight" || type === "rect" || type === "box") {
    action.type = "highlight";
  } else if (type === "clear" || type === "reset" || type === "wipe") {
    action.type = "clear";
  } else if (
    type === "stroke" ||
    type === "draw" ||
    type === "path" ||
    type === "line"
  ) {
    // Prefer upgrading simple 2-point strokes to arrows
    const pts = normalizePoints(action.points);
    if (pts.length === 2) {
      return {
        type: "arrow",
        id: action.id,
        from: pts[0],
        to: pts[1],
        color: action.color,
      };
    }
    action.type = "stroke";
    if (typeof action.id !== "string" || !action.id.trim()) {
      action.id = `stroke-${Math.random().toString(36).slice(2, 7)}`;
    }
    action.points = pts;
  }

  return action;
}

function normalizePoint(value: unknown): [number, number] | unknown {
  if (Array.isArray(value) && value.length >= 2) {
    return [Number(value[0]), Number(value[1])];
  }
  if (value && typeof value === "object") {
    const p = value as { x?: unknown; y?: unknown };
    if (p.x != null && p.y != null) return [Number(p.x), Number(p.y)];
  }
  return value;
}

function normalizePoints(value: unknown): [number, number][] {
  if (!Array.isArray(value) || value.length === 0) return [];
  if (typeof value[0] === "number") {
    const pairs: [number, number][] = [];
    for (let i = 0; i + 1 < value.length; i += 2) {
      pairs.push([Number(value[i]), Number(value[i + 1])]);
    }
    return pairs;
  }
  const pairs: [number, number][] = [];
  for (const item of value) {
    const p = normalizePoint(item);
    if (Array.isArray(p)) pairs.push(p as [number, number]);
  }
  return pairs;
}

export function clampBoard(n: number, max: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(max, Math.max(0, n));
}
