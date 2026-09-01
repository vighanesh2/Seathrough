import {
  boundingBoxForPoints,
  parseInterval,
  remapPointsToInterval,
  type Interval,
} from "@/lib/topics/geometry";
import type { BoardPoint, TopicBoardParams } from "@/lib/topics/schema";
import type { TopicModule } from "@/lib/topics/types";

/**
 * Control points for the reference picture. The first two are the interval
 * endpoints; the last two only bend the curve so the tangent point is
 * somewhere interesting.
 */
const BASE_POINTS: readonly BoardPoint[] = [
  [-1, -2],
  [6, 5],
  [-0.5, 1],
  [3, 3],
];

const BASE_INTERVAL: Interval = { a: -1, b: 6 };

function axisLabel(name: string, value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const label = `${name}=${rounded}`;
  return label.length <= 12 ? label : name;
}

function paramsForInterval(interval: Interval | null): TopicBoardParams {
  const points = interval
    ? remapPointsToInterval(BASE_POINTS, BASE_INTERVAL, interval)
    : BASE_POINTS.map(([x, y]) => [x, y] as BoardPoint);

  return {
    boardKind: "secant-tangent" as const,
    boundingBox: boundingBoxForPoints(points),
    points,
    labels: {
      a: interval ? axisLabel("a", interval.a) : "a",
      b: interval ? axisLabel("b", interval.b) : "b",
      c: "c",
    },
  };
}

function matchesMeanValueTheorem(prompt: string, conceptKey?: string): boolean {
  const blob = `${prompt} ${conceptKey ?? ""}`.toLowerCase();
  if (!blob.trim()) return false;

  // The integral form is a different statement and needs a different picture.
  if (/\bmean[-\s]?value\s+theorem\s+for\s+integrals?\b/.test(blob)) {
    return false;
  }

  if (/\bmean[-\s]?value\s+theorem\b/.test(blob)) return true;
  if (/\bmvt\b/.test(blob)) return true;

  return (
    /\bmean\s+value\b/.test(blob) &&
    /\b(calculus|derivative|secant|tangent|theorem)\b/.test(blob)
  );
}

export const meanValueTheoremTopic: TopicModule = {
  id: "mean-value-theorem",
  boardId: "secant-tangent",
  title: "The Mean Value Theorem",
  summary:
    "On a smooth arc there is always a point inside where the tangent runs parallel to the straight line joining the ends.",
  formula: "f'(c) = \\frac{f(b) - f(a)}{b - a}",
  aliases: [
    "mean value theorem",
    "mvt",
    "mean value theorem calculus",
    "average rate equals instantaneous rate",
  ],
  steps: [
    {
      title: "Start with the two ends",
      detail:
        "Take a curve that is unbroken across [a, b] and smooth strictly inside it. Mark the endpoints A and B.",
    },
    {
      title: "Draw the average",
      detail:
        "The dashed line through A and B is the secant. Its slope, (f(b) − f(a)) / (b − a), is the average rate of change across the whole interval.",
    },
    {
      title: "Find the matching instant",
      detail:
        "The theorem promises at least one c strictly between a and b where the tangent is parallel to that secant — so f'(c) equals the average rate.",
    },
    {
      title: "Test it yourself",
      detail:
        "Drag any point. However you reshape the curve, the red tangent keeps pointing the same way as the dashed secant.",
    },
  ],
  defaultParams: paramsForInterval(null),
  deriveParams: (prompt: string) => paramsForInterval(parseInterval(prompt)),
  matches: matchesMeanValueTheorem,
};
