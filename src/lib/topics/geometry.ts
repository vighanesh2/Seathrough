import type { BoardPoint, BoundingBox } from "@/lib/topics/schema";

export type Interval = { a: number; b: number };

const NUM = String.raw`-?\d+(?:\.\d+)?`;

const INTERVAL_PATTERNS: RegExp[] = [
  // "on [1, 5]" / "[1,5]"
  new RegExp(String.raw`\[\s*(${NUM})\s*,\s*(${NUM})\s*\]`),
  // "from 1 to 5" / "from x=1 to x=5"
  new RegExp(
    String.raw`\bfrom\s+(?:x\s*=\s*)?(${NUM})\s+to\s+(?:x\s*=\s*)?(${NUM})`,
  ),
  // "between 1 and 5"
  new RegExp(String.raw`\bbetween\s+(${NUM})\s+and\s+(${NUM})`),
  // "interval 1 to 5" / "interval 1, 5"
  new RegExp(String.raw`\binterval\s+(?:of\s+)?(${NUM})\s*(?:to|and|,)\s*(${NUM})`),
  // "on (1, 5)" — parenthesised only when clearly an interval
  new RegExp(String.raw`\bon\s*\(\s*(${NUM})\s*,\s*(${NUM})\s*\)`),
  // "a = 1 and b = 5" / "a=1, b=5"
  new RegExp(
    String.raw`\ba\s*=\s*(${NUM})\s*(?:,|\band\b)\s*b\s*=\s*(${NUM})`,
  ),
  // "when a is 1 and b is 5"
  new RegExp(
    String.raw`\bwhen\s+a\s+is\s+(${NUM})\s+and\s+b\s+is\s+(${NUM})`,
  ),
];

/** Widest interval we will draw before the board stops being readable. */
const MAX_ABS = 100;
const MIN_WIDTH = 0.5;
const MAX_WIDTH = 50;

/**
 * Pull an interval out of a question, e.g. "MVT for f on [1, 5]".
 * Returns null when the learner did not name one, or named a silly one.
 */
export function parseInterval(prompt: string): Interval | null {
  const text = prompt.toLowerCase();

  for (const pattern of INTERVAL_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;

    const a = Number(match[1]);
    const b = Number(match[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (Math.abs(a) > MAX_ABS || Math.abs(b) > MAX_ABS) continue;

    const left = Math.min(a, b);
    const right = Math.max(a, b);
    const width = right - left;
    if (width < MIN_WIDTH || width > MAX_WIDTH) continue;

    return { a: left, b: right };
  }

  return null;
}

/**
 * Slide and scale the curve's control points onto a new interval.
 *
 * x and y scale by the same factor so the shape — and therefore the geometry
 * the theorem is about — is unchanged; only the window moves.
 */
export function remapPointsToInterval(
  points: readonly BoardPoint[],
  from: Interval,
  to: Interval,
): BoardPoint[] {
  const fromWidth = from.b - from.a;
  if (!Number.isFinite(fromWidth) || Math.abs(fromWidth) < 1e-9) {
    return points.map(([x, y]) => [x, y] as BoardPoint);
  }

  const scale = (to.b - to.a) / fromWidth;
  // Hold the endpoints' average height still so the curve stays framed.
  const yAnchor = points.length >= 2 ? (points[0][1] + points[1][1]) / 2 : 0;

  return points.map(([x, y]) => [
    to.a + (x - from.a) * scale,
    yAnchor + (y - yAnchor) * scale,
  ]) as BoardPoint[];
}

function bisect(
  gap: (x: number) => number,
  lo: number,
  hi: number,
): number {
  let low = lo;
  let high = hi;
  const lowIsNegative = gap(low) <= 0;

  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    const midGap = gap(mid);
    if (!Number.isFinite(midGap)) break;
    if (lowIsNegative === midGap <= 0) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/**
 * Find the point strictly inside [a, b] where the curve's slope matches
 * `targetSlope` — the c the Mean Value Theorem promises.
 *
 * Brackets a sign change and bisects it rather than running Newton, because
 * Newton can converge to a root outside the interval and draw a tangent that
 * contradicts the picture. Falls back to the midpoint if no crossing shows up,
 * which only happens for inputs the theorem does not apply to.
 */
export function solveParallelPoint(
  derivative: (x: number) => number,
  a: number,
  b: number,
  targetSlope: number,
): number {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const mid = (lo + hi) / 2;
  if (!(hi - lo > 1e-9) || !Number.isFinite(targetSlope)) return mid;

  const gap = (x: number): number => derivative(x) - targetSlope;

  // Start just inside the ends: c has to be strictly between a and b, so an
  // endpoint that happens to solve it must not win.
  const inset = (hi - lo) * 1e-6;
  const from = lo + inset;
  const to = hi - inset;

  const steps = 64;
  let prevX = from;
  let prevGap = gap(from);

  for (let i = 1; i <= steps; i += 1) {
    const x = from + ((to - from) * i) / steps;
    const currentGap = gap(x);
    if (
      Number.isFinite(prevGap) &&
      Number.isFinite(currentGap) &&
      prevGap * currentGap <= 0
    ) {
      return bisect(gap, prevX, x);
    }
    prevX = x;
    prevGap = currentGap;
  }

  return mid;
}

/** A JSXGraph window that comfortably contains every control point. */
export function boundingBoxForPoints(points: readonly BoardPoint[]): BoundingBox {
  if (points.length === 0) return [-5, 10, 7, -6];

  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const padX = Math.max(1.5, (maxX - minX) * 0.3);
  const padY = Math.max(1.5, (maxY - minY) * 0.45);

  return [minX - padX, maxY + padY, maxX + padX, minY - padY];
}
