import {
  boundingBoxForFunction,
  cleanFunctionExpression,
  extractFunctionExpression,
} from "@/lib/topics/functionParse";
import type { BoundingBox } from "@/lib/topics/schema";

export type ExperimentGraphPoint = {
  x: number;
  y: number;
  label?: string;
};

export type ExperimentGraph = {
  title?: string;
  xLabel?: string;
  yLabel?: string;
  expression?: string;
  points: ExperimentGraphPoint[];
  showTangent?: boolean;
};

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clipLabel(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().slice(0, max);
  return text || undefined;
}

function coercePoints(raw: unknown): ExperimentGraphPoint[] {
  const list = Array.isArray(raw) ? raw : [];
  const points: ExperimentGraphPoint[] = [];
  for (const item of list) {
    if (Array.isArray(item) && item.length >= 2) {
      points.push({
        x: num(item[0]),
        y: num(item[1]),
        ...(typeof item[2] === "string" && item[2].trim()
          ? { label: String(item[2]).trim().slice(0, 24) }
          : {}),
      });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    points.push({
      x: num(row.x ?? row[0]),
      y: num(row.y ?? row[1]),
      ...(typeof (row.label ?? row.name) === "string"
        ? { label: String(row.label ?? row.name).trim().slice(0, 24) }
        : {}),
    });
  }
  return points;
}

function expressionFromRaw(obj: Record<string, unknown>): string | undefined {
  const direct = cleanFunctionExpression(
    String(obj.expression ?? obj.fn ?? obj.formula ?? obj.y ?? ""),
  );
  if (direct) return direct;
  const titled = extractFunctionExpression(
    String(obj.title ?? obj.caption ?? ""),
  );
  return titled ?? undefined;
}

export function coerceGraph(raw: unknown): ExperimentGraph | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const points = coercePoints(obj.points ?? obj.data);
  const expression = expressionFromRaw(obj);
  if (!expression && points.length < 2) return null;

  const title = clipLabel(obj.title, 60);
  const xLabel = clipLabel(obj.xLabel ?? obj.xlabel, 24);
  const yLabel = clipLabel(obj.yLabel ?? obj.ylabel, 24);
  const showTangent =
    obj.showTangent === true ||
    obj.tangent === true ||
    obj.derivative === true;

  return {
    ...(title ? { title } : {}),
    ...(xLabel ? { xLabel } : {}),
    ...(yLabel ? { yLabel } : {}),
    ...(expression ? { expression } : {}),
    points,
    ...(showTangent ? { showTangent: true } : {}),
  };
}

export function boundingBoxForGraph(graph: ExperimentGraph): BoundingBox {
  if (graph.expression) return boundingBoxForFunction(graph.expression);
  if (graph.points.length < 2) return [-5, 12, 5, -2];
  const xs = graph.points.map((point) => point.x);
  const ys = graph.points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padX = Math.max(0.8, (maxX - minX || 1) * 0.18);
  const padY = Math.max(0.8, (maxY - minY || 1) * 0.22);
  return [minX - padX, maxY + padY, maxX + padX, minY - padY];
}

export function graphFromPrompt(prompt: string): ExperimentGraph | null {
  const calculus =
    /\b(derivative|differentiate|differentiation|tangent line|secant line|instantaneous (rate|slope)|f'\s*\()/i.test(
      prompt,
    );
  const expression = extractFunctionExpression(prompt) ?? (calculus ? "x^2" : null);
  if (!expression) return null;
  return {
    title: calculus ? `Slope of y = ${expression}` : `y = ${expression}`,
    xLabel: "x",
    yLabel: "y",
    expression,
    points: [],
    showTangent: calculus || /\b(tangent|derivative|slope)\b/i.test(prompt),
  };
}

export function mergeGraph(
  current: ExperimentGraph | undefined,
  extra: ExperimentGraph | undefined,
): ExperimentGraph | undefined {
  if (!current) return extra;
  if (!extra) return current;
  return {
    title: extra.title || current.title,
    xLabel: extra.xLabel || current.xLabel,
    yLabel: extra.yLabel || current.yLabel,
    expression: extra.expression || current.expression,
    points: extra.points.length ? extra.points : current.points,
    showTangent: extra.showTangent || current.showTangent,
  };
}

export function visibleLessonGraph(
  beats: Array<{ graph?: ExperimentGraph }>,
  currentBeat: number,
): ExperimentGraph | null {
  let found: ExperimentGraph | null = null;
  const last = Math.min(currentBeat, beats.length - 1);
  for (let i = 0; i <= last; i += 1) {
    const graph = beats[i]?.graph;
    if (graph) found = graph;
  }
  return found;
}
