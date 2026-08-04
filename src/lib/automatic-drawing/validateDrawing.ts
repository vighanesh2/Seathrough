import type {
  AutoCommand,
  WhiteboardPlan,
} from "@/lib/automatic-drawing/strokePlan";

export type DrawingIntent =
  | {
      kind: "regular_polygon";
      sides: number;
      name: string;
    }
  | {
      kind: "circle";
      name: string;
    }
  | {
      kind: "square";
      name: string;
    }
  | {
      kind: "open";
      name?: string;
    };

const POLYGON_NAMES: Array<{ re: RegExp; sides: number; name: string }> = [
  { re: /\b(equilateral\s+)?triangle\b/i, sides: 3, name: "Triangle" },
  { re: /\bsquare\b/i, sides: 4, name: "Square" },
  { re: /\brectangle\b/i, sides: 4, name: "Rectangle" },
  { re: /\bpentagon\b/i, sides: 5, name: "Pentagon" },
  { re: /\bhexagon\b/i, sides: 6, name: "Hexagon" },
  { re: /\bheptagon\b/i, sides: 7, name: "Heptagon" },
  { re: /\boctagon\b/i, sides: 8, name: "Octagon" },
  { re: /\bnonagon\b/i, sides: 9, name: "Nonagon" },
  { re: /\bdecagon\b/i, sides: 10, name: "Decagon" },
  {
    re: /\b(\d+)\s*[-\s]?sided\s+(polygon|shape)\b/i,
    sides: 0,
    name: "Polygon",
  },
];

export function detectDrawingIntent(prompt: string): DrawingIntent {
  const text = prompt.trim();
  if (!text) return { kind: "open" };

  for (const entry of POLYGON_NAMES) {
    const m = text.match(entry.re);
    if (!m) continue;
    if (entry.sides === 0) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= 3 && n <= 16) {
        return {
          kind: "regular_polygon",
          sides: n,
          name: `${n}-gon`,
        };
      }
      continue;
    }
    if (/\bsquare\b/i.test(text)) {
      return { kind: "square", name: "Square" };
    }
    if (entry.name === "Rectangle") {
      return { kind: "regular_polygon", sides: 4, name: "Rectangle" };
    }
    return {
      kind: "regular_polygon",
      sides: entry.sides,
      name: entry.name,
    };
  }

  if (/\b(circle|disk)\b/i.test(text)) {
    return { kind: "circle", name: "Circle" };
  }

  return { kind: "open" };
}

function dist(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Count unique vertices of a closed polyline (flat points). */
export function countClosedPolygonSides(flat: number[]): number | null {
  if (flat.length < 6 || flat.length % 2 !== 0) return null;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    pts.push({ x: flat[i]!, y: flat[i + 1]! });
  }
  if (pts.length < 3) return null;

  // Drop consecutive duplicates
  const cleaned: Array<{ x: number; y: number }> = [pts[0]!];
  for (let i = 1; i < pts.length; i += 1) {
    if (dist(cleaned[cleaned.length - 1]!, pts[i]!) > 2) {
      cleaned.push(pts[i]!);
    }
  }

  // If closed, last ≈ first — remove closing point
  if (cleaned.length >= 2 && dist(cleaned[0]!, cleaned[cleaned.length - 1]!) <= 4) {
    cleaned.pop();
  }

  return cleaned.length >= 3 ? cleaned.length : null;
}

export function extractLargestStrokeSides(plan: WhiteboardPlan): number | null {
  let best: number | null = null;
  let bestLen = 0;
  for (const cmd of plan.commands) {
    if (cmd.type === "stroke") {
      const sides = countClosedPolygonSides(cmd.points);
      if (sides && cmd.points.length > bestLen) {
        best = sides;
        bestLen = cmd.points.length;
      }
    } else if (cmd.type === "rect") {
      if (4 > (best ?? 0)) best = 4;
    } else if (cmd.type === "circle") {
      // not a polygon
    }
  }
  return best;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: string; expectedSides?: number; actualSides?: number };

export function validatePlanAgainstIntent(
  plan: WhiteboardPlan,
  intent: DrawingIntent,
): ValidationResult {
  if (intent.kind === "open") return { ok: true };

  if (intent.kind === "circle") {
    const hasCircle = plan.commands.some((c) => c.type === "circle");
    if (hasCircle) return { ok: true };
    // A stroke approximating a circle is weak; require circle command
    return {
      ok: false,
      reason: "Expected a circle command for a circle prompt",
    };
  }

  if (intent.kind === "square") {
    const hasRect = plan.commands.some(
      (c) => c.type === "rect" && Math.abs(c.w - c.h) <= Math.max(c.w, c.h) * 0.08,
    );
    if (hasRect) return { ok: true };
    const sides = extractLargestStrokeSides(plan);
    if (sides === 4) return { ok: true };
    return {
      ok: false,
      reason: "Expected a square (4 equal sides)",
      expectedSides: 4,
      actualSides: sides ?? undefined,
    };
  }

  if (intent.kind === "regular_polygon") {
    const sides = extractLargestStrokeSides(plan);
    if (sides === intent.sides) return { ok: true };
    return {
      ok: false,
      reason: `Expected a ${intent.name.toLowerCase()} with ${intent.sides} sides, got ${sides ?? "something else"}`,
      expectedSides: intent.sides,
      actualSides: sides ?? undefined,
    };
  }

  return { ok: true };
}

/** Deterministic regular polygon (or circle/square) — never trust the LLM for side counts. */
export function buildDeterministicShapePlan(
  intent: Exclude<DrawingIntent, { kind: "open" }>,
): WhiteboardPlan {
  const width = 900;
  const height = 600;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 160;
  const color = "#1a2b3c";
  const strokeWidth = 3;

  if (intent.kind === "circle") {
    return {
      title: intent.name,
      width,
      height,
      commands: [
        { type: "circle", x: cx, y: cy, radius, color, width: strokeWidth },
        {
          type: "text",
          x: cx - 40,
          y: cy + radius + 24,
          text: intent.name,
          color,
          fontSize: 20,
        },
      ],
    };
  }

  if (intent.kind === "square") {
    const s = radius * Math.SQRT2;
    return {
      title: intent.name,
      width,
      height,
      commands: [
        {
          type: "rect",
          x: cx - s / 2,
          y: cy - s / 2,
          w: s,
          h: s,
          color,
          width: strokeWidth,
        },
        {
          type: "text",
          x: cx - 36,
          y: cy + s / 2 + 24,
          text: intent.name,
          color,
          fontSize: 20,
        },
      ],
    };
  }

  // regular_polygon
  const sides = intent.sides;
  const points: number[] = [];
  // Point-up orientation
  const startAngle = -Math.PI / 2;
  for (let i = 0; i <= sides; i += 1) {
    const a = startAngle + (i / sides) * Math.PI * 2;
    points.push(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
  }

  const commands: AutoCommand[] = [
    { type: "stroke", points, color, width: strokeWidth },
    {
      type: "text",
      x: cx - Math.min(80, intent.name.length * 6),
      y: cy + radius + 28,
      text: `${intent.name} (${sides} sides)`,
      color,
      fontSize: 18,
    },
  ];

  return {
    title: intent.name,
    width,
    height,
    commands,
  };
}

export function canBuildDeterministically(
  intent: DrawingIntent,
): intent is Exclude<DrawingIntent, { kind: "open" }> {
  return intent.kind !== "open";
}
