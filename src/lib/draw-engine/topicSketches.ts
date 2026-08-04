import type { DrawCommand } from "@/lib/draw-engine/commands";
import {
  reserve,
  type BoardLayout,
} from "@/lib/draw-engine/boardLayout";

export type TopicSketchInput = {
  prompt: string;
  beatOrder: number;
  beatId: string;
  t0Base: number;
  layout?: BoardLayout;
};

/**
 * Hand-drawn style visuals for common science / process topics.
 * Drawn on the right side so sentences can live on the left.
 */
export function topicSketchCommands(
  input: TopicSketchInput,
): DrawCommand[] | null {
  const blob = input.prompt.toLowerCase();
  if (/\bbig\s*bang\b|\bsingularit(?:y|ies)\b|\borigin of the universe\b/.test(blob)) {
    return bigBangSketch(input);
  }
  if (/\bphotosynthesis\b/.test(blob)) {
    return photosynthesisSketch(input);
  }
  if (/\bwater\s+cycle\b|\bhydrologic\b/.test(blob)) {
    return waterCycleSketch(input);
  }
  return null;
}

function bigBangSketch(input: TopicSketchInput): DrawCommand[] {
  const { beatOrder, beatId, t0Base: t, layout } = input;
  const cx = 680;
  const cy = 250;
  const cmds: DrawCommand[] = [];

  // Reserve sketch region so text placement avoids it.
  if (layout && beatOrder <= 1) {
    reserve(layout, {
      id: "sketch-bigbang",
      x: 540,
      y: 100,
      w: 320,
      h: 320,
      kind: "content",
    });
  }

  if (beatOrder <= 1) {
    // Singularity: small filled point
    cmds.push({
      id: `${beatId}-bb-core`,
      type: "circle",
      t0: t,
      durationMs: 500,
      x: cx,
      y: cy,
      radius: 10,
      color: "#b86a1e",
      width: 2,
      fill: "rgba(184,106,30,0.85)",
    });
    cmds.push({
      id: `${beatId}-bb-core-lbl`,
      type: "text",
      t0: t + 200,
      durationMs: 400,
      text: "singularity",
      x: cx - 36,
      y: cy + 22,
      color: "#b86a1e",
      fontSize: 14,
    });
  }

  if (beatOrder === 2 || beatOrder === 3) {
    // First expansion ring
    cmds.push({
      id: `${beatId}-bb-ring1`,
      type: "circle",
      t0: t,
      durationMs: 700,
      x: cx,
      y: cy,
      radius: 55,
      color: "#1b6ca8",
      width: 2.5,
    });
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI * 2 * i) / 6;
      cmds.push({
        id: `${beatId}-bb-ray${i}`,
        type: "line",
        t0: t + 120 + i * 40,
        durationMs: 450,
        x1: cx + Math.cos(ang) * 14,
        y1: cy + Math.sin(ang) * 14,
        x2: cx + Math.cos(ang) * 70,
        y2: cy + Math.sin(ang) * 70,
        color: "#1b6ca8",
        width: 2,
      });
    }
  }

  if (beatOrder >= 3) {
    cmds.push({
      id: `${beatId}-bb-ring2`,
      type: "circle",
      t0: t,
      durationMs: 700,
      x: cx,
      y: cy,
      radius: 110,
      color: "#2a7a5c",
      width: 2,
    });
    // Outer dashed feel via short stroke arcs
    cmds.push({
      id: `${beatId}-bb-ring3`,
      type: "stroke",
      t0: t + 200,
      durationMs: 800,
      points: circlePoints(cx, cy, 155, 24),
      color: "#6a7d90",
      width: 1.5,
      closed: true,
      jitter: 1.2,
    });
    cmds.push({
      id: `${beatId}-bb-exp-lbl`,
      type: "text",
      t0: t + 400,
      durationMs: 400,
      text: "universe expands",
      x: cx - 52,
      y: cy + 175,
      color: "#2a7a5c",
      fontSize: 14,
    });
  }

  if (beatOrder >= 5) {
    cmds.push({
      id: `${beatId}-bb-age`,
      type: "text",
      t0: t,
      durationMs: 450,
      text: "~13.8 billion years",
      x: cx - 58,
      y: cy - 175,
      color: "#4a6580",
      fontSize: 13,
    });
  }

  return cmds;
}

function photosynthesisSketch(input: TopicSketchInput): DrawCommand[] {
  const { beatOrder, beatId, t0Base: t, layout } = input;
  const cmds: DrawCommand[] = [];
  if (layout && beatOrder <= 1) {
    reserve(layout, {
      id: "sketch-photo",
      x: 540,
      y: 100,
      w: 320,
      h: 340,
      kind: "content",
    });
  }
  if (beatOrder <= 2) {
    // Simple leaf shape
    cmds.push({
      id: `${beatId}-leaf`,
      type: "stroke",
      t0: t,
      durationMs: 900,
      points: [
        { x: 700, y: 160 },
        { x: 760, y: 220 },
        { x: 720, y: 320 },
        { x: 640, y: 300 },
        { x: 620, y: 220 },
        { x: 700, y: 160 },
      ],
      color: "#2a7a5c",
      width: 2.5,
      closed: true,
      jitter: 1.4,
    });
  }
  if (beatOrder >= 3) {
    cmds.push(
      {
        id: `${beatId}-sun`,
        type: "circle",
        t0: t,
        durationMs: 500,
        x: 600,
        y: 140,
        radius: 22,
        color: "#b86a1e",
        width: 2,
        fill: "rgba(184,106,30,0.25)",
      },
      {
        id: `${beatId}-sun-arr`,
        type: "arrow",
        t0: t + 200,
        durationMs: 450,
        x1: 620,
        y1: 155,
        x2: 660,
        y2: 200,
        color: "#b86a1e",
        width: 2.5,
      },
    );
  }
  return cmds;
}

function waterCycleSketch(input: TopicSketchInput): DrawCommand[] {
  const { beatOrder, beatId, t0Base: t, layout } = input;
  const cmds: DrawCommand[] = [];
  if (layout && beatOrder <= 1) {
    reserve(layout, {
      id: "sketch-water",
      x: 540,
      y: 100,
      w: 320,
      h: 340,
      kind: "content",
    });
  }
  if (beatOrder <= 2) {
    cmds.push({
      id: `${beatId}-sea`,
      type: "stroke",
      t0: t,
      durationMs: 700,
      points: [
        { x: 560, y: 360 },
        { x: 620, y: 340 },
        { x: 700, y: 355 },
        { x: 780, y: 340 },
        { x: 840, y: 360 },
      ],
      color: "#1b6ca8",
      width: 3,
      jitter: 1.2,
    });
  }
  if (beatOrder >= 2) {
    cmds.push({
      id: `${beatId}-evap`,
      type: "arrow",
      t0: t,
      durationMs: 500,
      x1: 680,
      y1: 330,
      x2: 680,
      y2: 200,
      color: "#1b6ca8",
      width: 2.5,
    });
  }
  if (beatOrder >= 3) {
    cmds.push({
      id: `${beatId}-cloud`,
      type: "stroke",
      t0: t,
      durationMs: 700,
      points: [
        { x: 640, y: 160 },
        { x: 670, y: 140 },
        { x: 710, y: 145 },
        { x: 740, y: 160 },
        { x: 710, y: 180 },
        { x: 660, y: 175 },
        { x: 640, y: 160 },
      ],
      color: "#6a7d90",
      width: 2,
      closed: true,
      jitter: 1.3,
    });
  }
  return cmds;
}

function circlePoints(
  cx: number,
  cy: number,
  r: number,
  n: number,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * 2 * i) / n;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return pts;
}

/** Prefer left column for sentence writing when a sketch owns the right. */
export function preferLeftColumnForSketch(prompt: string): boolean {
  const blob = prompt.toLowerCase();
  return (
    /\bbig\s*bang\b|\bphotosynthesis\b|\bwater\s+cycle\b|\bsingularit/.test(
      blob,
    )
  );
}

export function sketchAwareLeftX(
  prompt: string,
  layout?: BoardLayout,
): number {
  if (!preferLeftColumnForSketch(prompt)) return 80;
  // Keep writing in left band if sketch reserved.
  if (layout?.occupied.some((o) => o.id.startsWith("sketch-"))) {
    return 56;
  }
  return 56;
}
