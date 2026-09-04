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

  const startX = Math.min(Math.max(1, params.xMin + 0.3), params.xMax - 0.3);
  let startY = 1;
  try {
    const y = compiled?.(startX);
    if (typeof y === "number" && Number.isFinite(y)) startY = y;
  } catch {
    /* keep default */
  }

  const p = board.create("glider", [startX, startY, f], {
    name: "P",
    size: 4,
    strokeColor: BOARD_COLORS.point,
    fillColor: BOARD_COLORS.point,
    withLabel: true,
    label: { fontSize: 14, strokeColor: BOARD_COLORS.curve },
  });

  if (params.showTangent !== false) {
    board.create("tangent", [p], {
      strokeColor: "#b8431e",
      strokeWidth: 2,
      highlight: false,
    });
  }

  board.create(
    "text",
    [
      params.boundingBox[0] + 0.3,
      params.boundingBox[1] - 0.4,
      () => `y = ${params.expression}`,
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
