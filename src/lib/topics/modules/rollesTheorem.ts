import {
  boundingBoxForPoints,
  parseInterval,
  remapPointsToInterval,
  type Interval,
} from "@/lib/topics/geometry";
import type { BoardPoint, TopicBoardParams } from "@/lib/topics/schema";
import type { TopicModule } from "@/lib/topics/types";

/**
 * Rolle's theorem is the Mean Value Theorem with a level secant, so it reuses
 * the same board — only the endpoints are moved to equal heights. Three points
 * make a parabola, which keeps exactly one interior turning point.
 */
const BASE_POINTS: readonly BoardPoint[] = [
  [-1, 1],
  [6, 1],
  [2.5, 5],
];

const BASE_INTERVAL: Interval = { a: -1, b: 6 };

function paramsForInterval(interval: Interval | null): TopicBoardParams {
  const points = interval
    ? remapPointsToInterval(BASE_POINTS, BASE_INTERVAL, interval)
    : BASE_POINTS.map(([x, y]) => [x, y] as BoardPoint);

  return {
    boundingBox: boundingBoxForPoints(points),
    points,
    labels: { a: "a", b: "b", c: "c" },
    flatSecant: true,
  };
}

function matchesRollesTheorem(prompt: string, conceptKey?: string): boolean {
  const blob = `${prompt} ${conceptKey ?? ""}`.toLowerCase();
  if (!blob.trim()) return false;

  if (/\brolle'?s\s+theorem\b/.test(blob)) return true;
  return /\brolle'?s?\b/.test(blob) && /\btheorem\b/.test(blob);
}

export const rollesTheoremTopic: TopicModule = {
  id: "rolles-theorem",
  boardId: "secant-tangent",
  title: "Rolle's Theorem",
  summary:
    "When a smooth curve returns to the same height it started at, it has to level off somewhere in between.",
  formula: "f(a) = f(b) \\;\\Rightarrow\\; f'(c) = 0",
  aliases: ["rolles theorem", "rolle's theorem", "rolle theorem"],
  steps: [
    {
      title: "Same height at both ends",
      detail:
        "Rolle's theorem starts where the Mean Value Theorem does, with one extra condition: f(a) = f(b).",
    },
    {
      title: "The secant goes flat",
      detail:
        "Equal endpoint heights make the dashed secant horizontal, so its slope is 0.",
    },
    {
      title: "So some tangent is flat too",
      detail:
        "The tangent still has to run parallel to the secant, which now means f'(c) = 0 — the curve turns around at c.",
    },
    {
      title: "Test it yourself",
      detail:
        "Drag the peak up or down. The turning point slides, but it never leaves the interval.",
    },
  ],
  defaultParams: paramsForInterval(null),
  deriveParams: (prompt: string) => paramsForInterval(parseInterval(prompt)),
  matches: matchesRollesTheorem,
};
