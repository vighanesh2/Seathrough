import type { DrawCommand } from "@/lib/draw-engine/commands";
import {
  reserve,
  type BoardLayout,
} from "@/lib/draw-engine/boardLayout";
import { isGraphBoardTopic, isIntegralAreaTopic, isLimitGraphTopic, isMatrixMultiplyTopic } from "@/lib/visuals/library/topicMatch";

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
  if (isIntegralAreaTopic(input.prompt)) {
    return integralAreaSketch(input);
  }
  if (isLimitGraphTopic(input.prompt)) {
    return limitGraphSketch(input);
  }
  if (isMatrixMultiplyTopic(input.prompt)) {
    return matrixMultiplySketch(input);
  }
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

function integralAreaSketch(input: TopicSketchInput): DrawCommand[] {
  const { beatOrder, beatId, t0Base: t, layout } = input;
  const ox = 560;
  const oy = 390;
  const xEnd = 850;
  const yTop = 130;
  const aX = 610;
  const bX = 800;

  const curveY = (x: number) => {
    const t01 = (x - aX) / (bX - aX);
    const clamped = Math.max(0, Math.min(1, t01));
    return oy - 8 - 200 * Math.sin(Math.PI * clamped);
  };

  const cmds: DrawCommand[] = [];

  if (layout && beatOrder <= 1) {
    reserve(layout, {
      id: "sketch-integral",
      x: 530,
      y: 100,
      w: 350,
      h: 340,
      kind: "content",
    });
  }

  if (beatOrder <= 1) {
    cmds.push(
      {
        id: `${beatId}-int-xaxis`,
        type: "line",
        t0: t,
        durationMs: 500,
        x1: ox,
        y1: oy,
        x2: xEnd,
        y2: oy,
        color: "#1a2b3c",
        width: 2,
      },
      {
        id: `${beatId}-int-yaxis`,
        type: "line",
        t0: t + 80,
        durationMs: 500,
        x1: ox,
        y1: oy,
        x2: ox,
        y2: yTop,
        color: "#1a2b3c",
        width: 2,
      },
      {
        id: `${beatId}-int-xlbl`,
        type: "text",
        t0: t + 200,
        durationMs: 350,
        text: "x",
        x: xEnd - 4,
        y: oy + 8,
        color: "#4a6580",
        fontSize: 14,
      },
      {
        id: `${beatId}-int-ylbl`,
        type: "text",
        t0: t + 200,
        durationMs: 350,
        text: "y",
        x: ox - 18,
        y: yTop - 4,
        color: "#4a6580",
        fontSize: 14,
      },
      {
        id: `${beatId}-int-a`,
        type: "text",
        t0: t + 280,
        durationMs: 350,
        text: "a",
        x: aX - 4,
        y: oy + 8,
        color: "#1b6ca8",
        fontSize: 14,
      },
      {
        id: `${beatId}-int-b`,
        type: "text",
        t0: t + 320,
        durationMs: 350,
        text: "b",
        x: bX - 4,
        y: oy + 8,
        color: "#1b6ca8",
        fontSize: 14,
      },
    );
  }

  if (beatOrder === 2) {
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 16; i += 1) {
      const x = aX + ((bX - aX) * i) / 16;
      points.push({ x, y: curveY(x) });
    }
    cmds.push(
      {
        id: `${beatId}-int-curve`,
        type: "stroke",
        t0: t,
        durationMs: 900,
        points,
        color: "#1b6ca8",
        width: 3,
        jitter: 0.5,
      },
      {
        id: `${beatId}-int-fx`,
        type: "text",
        t0: t + 400,
        durationMs: 400,
        text: "f(x)",
        x: (aX + bX) / 2 + 18,
        y: curveY((aX + bX) / 2) - 22,
        color: "#1b6ca8",
        fontSize: 15,
      },
      {
        id: `${beatId}-int-guide-a`,
        type: "line",
        t0: t + 200,
        durationMs: 400,
        x1: aX,
        y1: oy,
        x2: aX,
        y2: curveY(aX),
        color: "#6a7d90",
        width: 1,
      },
      {
        id: `${beatId}-int-guide-b`,
        type: "line",
        t0: t + 260,
        durationMs: 400,
        x1: bX,
        y1: oy,
        x2: bX,
        y2: curveY(bX),
        color: "#6a7d90",
        width: 1,
      },
    );
  }

  if (beatOrder === 3) {
    const n = 6;
    const dx = (bX - aX) / n;
    for (let i = 0; i < n; i += 1) {
      const x0 = aX + i * dx;
      const top = curveY(x0 + dx / 2);
      const h = oy - top;
      if (h <= 2) continue;
      cmds.push({
        id: `${beatId}-int-bar${i}`,
        type: "rect",
        t0: t + i * 70,
        durationMs: 420,
        x: x0 + 1,
        y: top,
        w: Math.max(4, dx - 3),
        h,
        color: "rgba(27,108,168,0.4)",
        width: 1,
        fill: "rgba(27,108,168,0.22)",
      });
    }
  }

  if (beatOrder === 4) {
    cmds.push({
      id: `${beatId}-int-area`,
      type: "text",
      t0: t,
      durationMs: 450,
      text: "area",
      x: (aX + bX) / 2 - 16,
      y: oy - 96,
      color: "#1b6ca8",
      fontSize: 16,
    });
  }

  return cmds;
}

function limitGraphSketch(input: TopicSketchInput): DrawCommand[] {
  const { beatOrder, beatId, t0Base: t, layout } = input;
  const ox = 560;
  const oy = 390;
  const xEnd = 850;
  const yTop = 130;
  const aX = 705;
  const lY = 248;

  const curveY = (x: number) => lY + 72 * Math.sin((x - aX) / 52);

  const cmds: DrawCommand[] = [];

  if (layout && beatOrder <= 1) {
    reserve(layout, {
      id: "sketch-limit",
      x: 530,
      y: 100,
      w: 350,
      h: 340,
      kind: "content",
    });
  }

  if (beatOrder <= 1) {
    cmds.push(
      {
        id: `${beatId}-lim-xaxis`,
        type: "line",
        t0: t,
        durationMs: 500,
        x1: ox,
        y1: oy,
        x2: xEnd,
        y2: oy,
        color: "#1a2b3c",
        width: 2,
      },
      {
        id: `${beatId}-lim-yaxis`,
        type: "line",
        t0: t + 80,
        durationMs: 500,
        x1: ox,
        y1: oy,
        x2: ox,
        y2: yTop,
        color: "#1a2b3c",
        width: 2,
      },
      {
        id: `${beatId}-lim-xlbl`,
        type: "text",
        t0: t + 200,
        durationMs: 350,
        text: "x",
        x: xEnd - 4,
        y: oy + 8,
        color: "#4a6580",
        fontSize: 14,
      },
      {
        id: `${beatId}-lim-ylbl`,
        type: "text",
        t0: t + 200,
        durationMs: 350,
        text: "y",
        x: ox - 18,
        y: yTop - 4,
        color: "#4a6580",
        fontSize: 14,
      },
      {
        id: `${beatId}-lim-a`,
        type: "text",
        t0: t + 280,
        durationMs: 350,
        text: "a",
        x: aX - 4,
        y: oy + 8,
        color: "#1b6ca8",
        fontSize: 14,
      },
    );
    cmds.push(
      ...dashedLine(`${beatId}-lim-va`, t + 300, aX, oy, aX, curveY(aX) + 10, "#6a7d90"),
    );
  }

  if (beatOrder === 2) {
    const leftPts: Array<{ x: number; y: number }> = [];
    const rightPts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= 10; i += 1) {
      const x = ox + 24 + ((aX - 14 - (ox + 24)) * i) / 10;
      leftPts.push({ x, y: curveY(x) });
    }
    for (let i = 0; i <= 10; i += 1) {
      const x = aX + 14 + ((xEnd - 24 - (aX + 14)) * i) / 10;
      rightPts.push({ x, y: curveY(x) });
    }
    cmds.push(
      {
        id: `${beatId}-lim-curve-l`,
        type: "stroke",
        t0: t,
        durationMs: 700,
        points: leftPts,
        color: "#1b6ca8",
        width: 3,
        jitter: 0.4,
      },
      {
        id: `${beatId}-lim-curve-r`,
        type: "stroke",
        t0: t + 200,
        durationMs: 700,
        points: rightPts,
        color: "#1b6ca8",
        width: 3,
        jitter: 0.4,
      },
      {
        id: `${beatId}-lim-hole`,
        type: "circle",
        t0: t + 500,
        durationMs: 400,
        x: aX,
        y: lY,
        radius: 7,
        color: "#1b6ca8",
        width: 2,
        fill: "#f3f5f7",
      },
      {
        id: `${beatId}-lim-fx`,
        type: "text",
        t0: t + 400,
        durationMs: 400,
        text: "f(x)",
        x: ox + 36,
        y: curveY(ox + 80) - 20,
        color: "#1b6ca8",
        fontSize: 15,
      },
    );
  }

  if (beatOrder === 3) {
    const xs = [aX - 78, aX - 48, aX - 22];
    xs.forEach((x, i) => {
      cmds.push({
        id: `${beatId}-lim-left${i}`,
        type: "circle",
        t0: t + i * 120,
        durationMs: 380,
        x,
        y: curveY(x),
        radius: 4 + i,
        color: "#b86a1e",
        width: 1.5,
        fill: "rgba(184,106,30,0.85)",
      });
    });
    cmds.push({
      id: `${beatId}-lim-left-arr`,
      type: "arrow",
      t0: t + 280,
      durationMs: 450,
      x1: aX - 86,
      y1: curveY(aX - 86),
      x2: aX - 16,
      y2: lY + 4,
      color: "#b86a1e",
      width: 2,
    });
  }

  if (beatOrder === 4) {
    const xs = [aX + 22, aX + 48, aX + 78];
    xs.forEach((x, i) => {
      cmds.push({
        id: `${beatId}-lim-right${i}`,
        type: "circle",
        t0: t + i * 120,
        durationMs: 380,
        x,
        y: curveY(x),
        radius: 6 - i,
        color: "#2a7a5c",
        width: 1.5,
        fill: "rgba(42,122,92,0.85)",
      });
    });
    cmds.push({
      id: `${beatId}-lim-right-arr`,
      type: "arrow",
      t0: t + 280,
      durationMs: 450,
      x1: aX + 86,
      y1: curveY(aX + 86),
      x2: aX + 16,
      y2: lY + 4,
      color: "#2a7a5c",
      width: 2,
    });
  }

  if (beatOrder === 5) {
    cmds.push(
      ...dashedLine(`${beatId}-lim-hl`, t, ox, lY, aX - 10, lY, "#2a7a5c"),
      {
        id: `${beatId}-lim-L`,
        type: "text",
        t0: t + 200,
        durationMs: 400,
        text: "L",
        x: ox - 18,
        y: lY - 8,
        color: "#2a7a5c",
        fontSize: 15,
      },
    );
  }

  return cmds;
}

const MX_CELL_W = 36;
const MX_CELL_H = 32;
const MX_GAP = 10;
const MX_PAD = 14;
const MX_TICK = 10;

function matrixInnerSize(cols: number, rows: number): { w: number; h: number } {
  return {
    w: cols * MX_CELL_W + (cols - 1) * MX_GAP,
    h: rows * MX_CELL_H + (rows - 1) * MX_GAP,
  };
}

function matrixOuterSize(cols: number, rows: number): { w: number; h: number } {
  const inner = matrixInnerSize(cols, rows);
  return { w: inner.w + MX_PAD * 2, h: inner.h + MX_PAD * 2 };
}

function cellCenter(
  originX: number,
  originY: number,
  row: number,
  col: number,
): { x: number; y: number } {
  return {
    x: originX + MX_PAD + col * (MX_CELL_W + MX_GAP) + MX_CELL_W / 2,
    y: originY + MX_PAD + row * (MX_CELL_H + MX_GAP) + MX_CELL_H / 2,
  };
}

function bracketCommands(
  id: string,
  t0: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): DrawCommand[] {
  return [
    {
      id: `${id}-l`,
      type: "line",
      t0,
      durationMs: 420,
      x1: x,
      y1: y,
      x2: x,
      y2: y + h,
      color,
      width: 2.5,
    },
    {
      id: `${id}-lt`,
      type: "line",
      t0: t0 + 40,
      durationMs: 280,
      x1: x,
      y1: y,
      x2: x + MX_TICK,
      y2: y,
      color,
      width: 2.5,
    },
    {
      id: `${id}-lb`,
      type: "line",
      t0: t0 + 40,
      durationMs: 280,
      x1: x,
      y1: y + h,
      x2: x + MX_TICK,
      y2: y + h,
      color,
      width: 2.5,
    },
    {
      id: `${id}-r`,
      type: "line",
      t0: t0 + 80,
      durationMs: 420,
      x1: x + w,
      y1: y,
      x2: x + w,
      y2: y + h,
      color,
      width: 2.5,
    },
    {
      id: `${id}-rt`,
      type: "line",
      t0: t0 + 120,
      durationMs: 280,
      x1: x + w - MX_TICK,
      y1: y,
      x2: x + w,
      y2: y,
      color,
      width: 2.5,
    },
    {
      id: `${id}-rb`,
      type: "line",
      t0: t0 + 120,
      durationMs: 280,
      x1: x + w - MX_TICK,
      y1: y + h,
      x2: x + w,
      y2: y + h,
      color,
      width: 2.5,
    },
  ];
}

function matrixNumber(
  id: string,
  t0: number,
  originX: number,
  originY: number,
  row: number,
  col: number,
  value: string,
  color: string,
): DrawCommand {
  const c = cellCenter(originX, originY, row, col);
  const digitW = value.length > 1 ? 7 * value.length : 6;
  return {
    id,
    type: "text",
    t0,
    durationMs: 360,
    text: value,
    x: c.x - digitW,
    y: c.y - 9,
    color,
    fontSize: 20,
  };
}

/**
 * 2×2 product drawn as real grids:
 *   [ 1  2 ]   [ 5  6 ]   [ 19  22 ]
 *   [ 3  4 ] × [ 7  8 ] = [ 43  50 ]
 */
function matrixMultiplySketch(input: TopicSketchInput): DrawCommand[] {
  const { beatOrder, beatId, t0Base: t, layout } = input;
  const A = { x: 498, y: 108 };
  const B = { x: 638, y: 108 };
  const C = { x: 778, y: 108 };
  const size = matrixOuterSize(2, 2);
  const cmds: DrawCommand[] = [];

  if (layout && beatOrder <= 1) {
    reserve(layout, {
      id: "sketch-matrix",
      x: 488,
      y: 72,
      w: 400,
      h: 280,
      kind: "content",
    });
  }

  if (beatOrder <= 1) {
    cmds.push(
      {
        id: `${beatId}-mx-A-lab`,
        type: "text",
        t0: t,
        durationMs: 280,
        text: "A",
        x: A.x + size.w / 2 - 6,
        y: A.y - 22,
        color: "#1b6ca8",
        fontSize: 16,
      },
      ...bracketCommands(`${beatId}-mx-A`, t + 40, A.x, A.y, size.w, size.h, "#1b6ca8"),
      matrixNumber(`${beatId}-mx-A00`, t + 180, A.x, A.y, 0, 0, "1", "#1a2b3c"),
      matrixNumber(`${beatId}-mx-A01`, t + 220, A.x, A.y, 0, 1, "2", "#1a2b3c"),
      matrixNumber(`${beatId}-mx-A10`, t + 260, A.x, A.y, 1, 0, "3", "#1a2b3c"),
      matrixNumber(`${beatId}-mx-A11`, t + 300, A.x, A.y, 1, 1, "4", "#1a2b3c"),
      {
        id: `${beatId}-mx-B-lab`,
        type: "text",
        t0: t + 80,
        durationMs: 280,
        text: "B",
        x: B.x + size.w / 2 - 6,
        y: B.y - 22,
        color: "#b86a1e",
        fontSize: 16,
      },
      ...bracketCommands(`${beatId}-mx-B`, t + 120, B.x, B.y, size.w, size.h, "#b86a1e"),
      matrixNumber(`${beatId}-mx-B00`, t + 260, B.x, B.y, 0, 0, "5", "#1a2b3c"),
      matrixNumber(`${beatId}-mx-B01`, t + 300, B.x, B.y, 0, 1, "6", "#1a2b3c"),
      matrixNumber(`${beatId}-mx-B10`, t + 340, B.x, B.y, 1, 0, "7", "#1a2b3c"),
      matrixNumber(`${beatId}-mx-B11`, t + 380, B.x, B.y, 1, 1, "8", "#1a2b3c"),
    );
  }

  if (beatOrder === 2) {
    cmds.push(
      {
        id: `${beatId}-mx-times`,
        type: "text",
        t0: t,
        durationMs: 280,
        text: "×",
        x: 618,
        y: A.y + size.h / 2 - 12,
        color: "#1a2b3c",
        fontSize: 22,
      },
      {
        id: `${beatId}-mx-eq`,
        type: "text",
        t0: t + 80,
        durationMs: 280,
        text: "=",
        x: 758,
        y: A.y + size.h / 2 - 12,
        color: "#1a2b3c",
        fontSize: 22,
      },
      {
        id: `${beatId}-mx-C-lab`,
        type: "text",
        t0: t + 120,
        durationMs: 280,
        text: "C",
        x: C.x + size.w / 2 - 6,
        y: C.y - 22,
        color: "#2a7a5c",
        fontSize: 16,
      },
      ...bracketCommands(`${beatId}-mx-C`, t + 160, C.x, C.y, size.w, size.h, "#2a7a5c"),
    );
  }

  if (beatOrder === 3) {
    const aRow = cellCenter(A.x, A.y, 0, 0);
    const bCol = cellCenter(B.x, B.y, 0, 0);
    cmds.push(
      {
        id: `${beatId}-mx-hl-a`,
        type: "highlight",
        t0: t,
        durationMs: 420,
        x: A.x + MX_PAD - 4,
        y: aRow.y - MX_CELL_H / 2 - 2,
        w: matrixInnerSize(2, 2).w + 8,
        h: MX_CELL_H + 4,
        color: "rgba(27,108,168,0.22)",
      },
      {
        id: `${beatId}-mx-hl-b`,
        type: "highlight",
        t0: t + 80,
        durationMs: 420,
        x: bCol.x - MX_CELL_W / 2 - 2,
        y: B.y + MX_PAD - 4,
        w: MX_CELL_W + 4,
        h: matrixInnerSize(2, 2).h + 8,
        color: "rgba(184,106,30,0.22)",
      },
      matrixNumber(`${beatId}-mx-C00`, t + 280, C.x, C.y, 0, 0, "19", "#2a7a5c"),
      {
        id: `${beatId}-mx-dot1`,
        type: "text",
        t0: t + 320,
        durationMs: 400,
        text: "1×5 + 2×7 = 19",
        x: 508,
        y: A.y + size.h + 18,
        color: "#2a7a5c",
        fontSize: 16,
      },
    );
  }

  if (beatOrder === 4) {
    const aRow = cellCenter(A.x, A.y, 0, 0);
    const bCol = cellCenter(B.x, B.y, 0, 1);
    cmds.push(
      {
        id: `${beatId}-mx-hl-a2`,
        type: "highlight",
        t0: t,
        durationMs: 420,
        x: A.x + MX_PAD - 4,
        y: aRow.y - MX_CELL_H / 2 - 2,
        w: matrixInnerSize(2, 2).w + 8,
        h: MX_CELL_H + 4,
        color: "rgba(27,108,168,0.16)",
      },
      {
        id: `${beatId}-mx-hl-b2`,
        type: "highlight",
        t0: t + 80,
        durationMs: 420,
        x: bCol.x - MX_CELL_W / 2 - 2,
        y: B.y + MX_PAD - 4,
        w: MX_CELL_W + 4,
        h: matrixInnerSize(2, 2).h + 8,
        color: "rgba(184,106,30,0.16)",
      },
      matrixNumber(`${beatId}-mx-C01`, t + 280, C.x, C.y, 0, 1, "22", "#2a7a5c"),
      {
        id: `${beatId}-mx-dot2`,
        type: "text",
        t0: t + 320,
        durationMs: 400,
        text: "1×6 + 2×8 = 22",
        x: 508,
        y: A.y + size.h + 40,
        color: "#2a7a5c",
        fontSize: 16,
      },
    );
  }

  if (beatOrder === 5) {
    cmds.push(
      matrixNumber(`${beatId}-mx-C10`, t, C.x, C.y, 1, 0, "43", "#2a7a5c"),
      matrixNumber(`${beatId}-mx-C11`, t + 80, C.x, C.y, 1, 1, "50", "#2a7a5c"),
      {
        id: `${beatId}-mx-box`,
        type: "rect",
        t0: t + 160,
        durationMs: 480,
        x: C.x - 6,
        y: C.y - 6,
        w: size.w + 12,
        h: size.h + 12,
        color: "#2a7a5c",
        width: 2,
      },
      {
        id: `${beatId}-mx-dot3`,
        type: "text",
        t0: t + 200,
        durationMs: 400,
        text: "3×5 + 4×7 = 43   3×6 + 4×8 = 50",
        x: 508,
        y: A.y + size.h + 62,
        color: "#2a7a5c",
        fontSize: 15,
      },
    );
  }

  return cmds;
}

function dashedLine(
  id: string,
  t0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
): DrawCommand[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 4) return [];
  const n = Math.max(4, Math.round(len / 12));
  const cmds: DrawCommand[] = [];
  for (let i = 0; i < n; i += 2) {
    const tA = i / n;
    const tB = Math.min(1, (i + 1) / n);
    cmds.push({
      id: `${id}-${i}`,
      type: "line",
      t0: t0 + i * 18,
      durationMs: 220,
      x1: x1 + dx * tA,
      y1: y1 + dy * tA,
      x2: x1 + dx * tB,
      y2: y1 + dy * tB,
      color,
      width: 1.5,
    });
  }
  return cmds;
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
    ) ||
    isGraphBoardTopic(prompt) ||
    isMatrixMultiplyTopic(prompt)
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
