import {
  BOARD_COLORS,
  type TopicBoardContext,
} from "@/components/topics/boards/types";
import type { OdeSolutionBoardParams } from "@/lib/topics/schema";

const SOLUTION_COLOR = "#b8431e";
const RK_STEPS = 200;

function asOdeParams(
  params: TopicBoardContext["params"],
): OdeSolutionBoardParams | null {
  return params.boardKind === "ode-solution" ? params : null;
}

/**
 * Interactive ODE plot: y' = f(t, y) with sliders for c and N, draggable
 * initial point, and a numerically integrated solution curve (Heun method).
 *
 * Based on the JSXGraph ODE examples; expressions are curated JessieCode
 * snippets — never arbitrary user JavaScript.
 */
export function drawOdeSolution(ctx: TopicBoardContext): void {
  const params = asOdeParams(ctx.params);
  if (!params) return;

  const { JXG, board } = ctx;

  const numerics = JXG.Math.Numerics;
  const jc = board.jc;

  const timeSpan = board.create(
    "slider",
    [
      [-7, 9.5],
      [7, 9.5],
      [params.timeSpanMin, params.timeSpan, params.timeSpanMax],
    ],
    { name: "N", snapWidth: 0.5, highlight: false },
  );

  const parameter = board.create(
    "slider",
    [
      [-7, 8],
      [7, 8],
      [params.parameterMin, params.parameterC, params.parameterMax],
    ],
    { name: "c", snapWidth: 0.5, highlight: false },
  );

  const initial = board.create(
    "point",
    [params.initialT, params.initialY],
    {
      name: "(t₀, y₀)",
      size: 4,
      strokeColor: BOARD_COLORS.point,
      fillColor: BOARD_COLORS.point,
      withLabel: true,
      label: { fontSize: 14, strokeColor: BOARD_COLORS.curve },
    },
  );

  let compiled: ((t: number, y: number) => number) | null = null;

  const compileExpression = (): void => {
    try {
      const snippet = jc.snippet(
        params.odeExpression,
        true,
        "t, y, c",
      ) as (t: number, y: number, c: number) => number;
      compiled = (t, y) => snippet(t, y, parameter.Value());
    } catch {
      compiled = (t, y) => y;
    }
  };

  compileExpression();

  const rhs = (t: number, state: number[]): number[] => {
    const slope = compiled ? compiled(t, state[0] ?? 0) : 0;
    return [Number.isFinite(slope) ? slope : 0];
  };

  const solution = board.create(
    "curve",
    [[0], [0]],
    {
      strokeColor: SOLUTION_COLOR,
      strokeWidth: 2.5,
      highlight: false,
    },
  ) as import("jsxgraph").Curve & {
    updateDataArray?: () => void;
  };

  solution.updateDataArray = function updateDataArray() {
    const span = timeSpan.Value();
    const t0 = initial.X();
    const data = numerics.rungeKutta(
      "heun",
      [initial.Y()],
      [t0, t0 + span],
      RK_STEPS,
      rhs,
    );

    const step = span / RK_STEPS;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < data.length; i += 1) {
      xs.push(t0 + i * step);
      ys.push(data[i]![0] ?? 0);
    }
    this.dataX = xs;
    this.dataY = ys;
  };

  board.create(
    "text",
    [-10.5, 10.2, () => `y' = ${params.odeExpression}`],
    {
      fontSize: 14,
      fixed: true,
      highlight: false,
      strokeColor: BOARD_COLORS.curve,
      cssStyle: "font-family: ui-sans-serif, system-ui, sans-serif;",
    },
  );

  board.create(
    "text",
    [-10.5, 9.2, () => `N = ${format(timeSpan.Value())}`],
    {
      fontSize: 12,
      fixed: true,
      highlight: false,
      strokeColor: BOARD_COLORS.muted,
    },
  );

  parameter.on("drag", () => {
    compileExpression();
    board.update();
  });
}

function format(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}
