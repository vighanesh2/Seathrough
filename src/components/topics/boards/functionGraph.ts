import {
  BOARD_COLORS,
  type TopicBoardContext,
} from "@/components/topics/boards/types";
import type { FunctionGraphBoardParams } from "@/lib/topics/schema";

function asFunctionParams(
  params: TopicBoardContext["params"],
): FunctionGraphBoardParams | null {
  return params.boardKind === "function-graph" ? params : null;
}

/**
 * Generic y = f(x) plot with a glider and optional tangent.
 * Expression is a JessieCode snippet vetted by functionParse.
 */
export function drawFunctionGraph(ctx: TopicBoardContext): void {
  const params = asFunctionParams(ctx.params);
  if (!params) return;

  const { board } = ctx;
  const jc = board.jc;

  let compiled: ((x: number) => number) | null = null;
  try {
    compiled = jc.snippet(params.expression, true, "x") as (x: number) => number;
  } catch {
    compiled = () => NaN;
  }

  const f = board.create(
    "functiongraph",
    [
      (x: number) => {
        try {
          const y = compiled ? compiled(x) : NaN;
          return Number.isFinite(y) ? y : NaN;
        } catch {
          return NaN;
        }
      },
      params.xMin,
      params.xMax,
    ],
    {
      strokeColor: BOARD_COLORS.curve,
      strokeWidth: 2.5,
      highlight: false,
    },
  );

  const yAt = (x: number, fallback: number) => {
    try {
      const y = compiled?.(x);
      return typeof y === "number" && Number.isFinite(y) ? y : fallback;
    } catch {
      return fallback;
    }
  };

  const clampX = (x: number) =>
    Math.min(Math.max(x, params.xMin + 0.4), params.xMax - 0.4);

  if (params.showSecant) {
    const aX = clampX(-1.2);
    const bX = clampX(Math.max(1.6, aX + 2));
    const a = board.create("glider", [aX, yAt(aX, 1), f], {
      name: "A",
      size: 4,
      strokeColor: BOARD_COLORS.point,
      fillColor: BOARD_COLORS.point,
      withLabel: true,
      label: { fontSize: 14, strokeColor: BOARD_COLORS.curve },
    });
    const b = board.create("glider", [bX, yAt(bX, 2), f], {
      name: "B",
      size: 4,
      strokeColor: BOARD_COLORS.secant,
      fillColor: BOARD_COLORS.secant,
      withLabel: true,
      label: { fontSize: 14, strokeColor: BOARD_COLORS.secant },
    });
    board.create("line", [a, b], {
      strokeColor: BOARD_COLORS.secant,
      strokeWidth: 2,
      name: "secant",
      withLabel: true,
      label: {
        fontSize: 13,
        strokeColor: BOARD_COLORS.secant,
        offset: [8, -16],
      },
      highlight: false,
    });
    if (params.showTangent !== false) {
      board.create("tangent", [a], {
        strokeColor: BOARD_COLORS.tangent,
        strokeWidth: 2.5,
        name: "tangent",
        withLabel: true,
        label: {
          fontSize: 13,
          strokeColor: BOARD_COLORS.tangent,
          offset: [8, 18],
        },
        highlight: false,
      });
    }
  } else {
    const startX = clampX(Math.min(Math.max(1, params.xMin + 0.3), params.xMax - 0.3));
    const p = board.create("glider", [startX, yAt(startX, 1), f], {
      name: "P",
      size: 4,
      strokeColor: BOARD_COLORS.point,
      fillColor: BOARD_COLORS.point,
      withLabel: true,
      label: { fontSize: 14, strokeColor: BOARD_COLORS.curve },
    });

    if (params.showTangent !== false) {
      board.create("tangent", [p], {
        strokeColor: BOARD_COLORS.tangent,
        strokeWidth: 2,
        highlight: false,
      });
    }
  }

  board.create(
    "text",
    [
      params.boundingBox[0] + 0.3,
      params.boundingBox[1] - 0.4,
      () => params.caption || `y = ${params.expression}`,
    ],
    {
      fontSize: 14,
      fixed: true,
      highlight: false,
      strokeColor: BOARD_COLORS.curve,
      cssStyle: "font-family: ui-sans-serif, system-ui, sans-serif;",
    },
  );
}
