import { BOARD_COLORS, type TopicBoardContext } from "@/components/topics/boards/types";
import { solveParallelPoint } from "@/lib/topics";

/**
 * The Mean Value Theorem picture, also used for Rolle's theorem.
 *
 * A curve is interpolated through draggable control points. `points[0]` and
 * `points[1]` are the interval ends a and b; a dashed secant joins them and a
 * solid tangent is pinned to the interior point c where the two slopes agree.
 * Drag anything and c re-solves, which is the whole lesson.
 */
export function drawSecantTangent({ JXG, board, params }: TopicBoardContext): void {
  if (params.boardKind !== "secant-tangent") return;

  const { points, labels, flatSecant } = params;
  const numerics = JXG.Math.Numerics;

  const controls = points.map(([x, y], index) => {
    const isEndpoint = index < 2;
    return board.create("point", [x, y], {
      name: isEndpoint ? (index === 0 ? labels.a : labels.b) : "",
      withLabel: isEndpoint,
      size: isEndpoint ? 4 : 3,
      strokeColor: isEndpoint ? BOARD_COLORS.point : BOARD_COLORS.muted,
      fillColor: isEndpoint ? BOARD_COLORS.point : "#ffffff",
      label: { fontSize: 15, strokeColor: BOARD_COLORS.curve },
      showInfobox: false,
    });
  });

  const [pointA, pointB] = controls;

  const f = numerics.lagrangePolynomial(controls);
  const df = numerics.D(f);

  const curve = board.create(
    "functiongraph",
    [f, () => board.getBoundingBox()[0], () => board.getBoundingBox()[2]],
    { strokeColor: BOARD_COLORS.curve, strokeWidth: 2.5, highlight: false },
  );

  /** Average rate of change across [a, b]. */
  const secantSlope = (): number => {
    const run = pointB.X() - pointA.X();
    if (Math.abs(run) < 1e-9) return 0;
    return (pointB.Y() - pointA.Y()) / run;
  };

  const solveC = (): number =>
    solveParallelPoint(df, pointA.X(), pointB.X(), secantSlope());

  // Every dependent element asks for c, so solve once per drag frame.
  let cachedSignature = "";
  let cachedC = (points[0][0] + points[1][0]) / 2;
  const valueC = (): number => {
    const signature = controls.map((p) => `${p.X()},${p.Y()}`).join("|");
    if (signature !== cachedSignature) {
      cachedSignature = signature;
      cachedC = solveC();
    }
    return cachedC;
  };

  const secant = board.create("line", [pointA, pointB], {
    straightFirst: false,
    straightLast: false,
    strokeColor: BOARD_COLORS.secant,
    strokeWidth: 2,
    dash: 2,
    highlight: false,
    fixed: true,
  });

  const tangentPoint = board.create(
    "glider",
    [() => valueC(), () => f(valueC()), curve],
    {
      name: labels.c,
      size: 4,
      strokeColor: BOARD_COLORS.tangent,
      fillColor: BOARD_COLORS.tangent,
      label: { fontSize: 15, strokeColor: BOARD_COLORS.tangent },
      fixed: true,
      showInfobox: false,
    },
  );

  board.create("tangent", [tangentPoint], {
    strokeColor: BOARD_COLORS.tangent,
    strokeWidth: 2.5,
    highlight: false,
    fixed: true,
  });

  // Drop a guide line so it is obvious where c sits on the x-axis.
  const foot = board.create("point", [() => valueC(), 0], {
    visible: false,
    fixed: true,
  });
  board.create("segment", [tangentPoint, foot], {
    strokeColor: BOARD_COLORS.muted,
    strokeWidth: 1,
    dash: 1,
    highlight: false,
    fixed: true,
  });

  const [left, top, right, bottom] = params.boundingBox;
  const legendX = left + (right - left) * 0.04;
  const legendTop = top - (top - bottom) * 0.08;
  const legendGap = (top - bottom) * 0.08;

  const legendStyle = {
    fontSize: 13,
    fixed: true,
    highlight: false,
    cssStyle: "font-family: ui-sans-serif, system-ui, sans-serif;",
  } as const;

  board.create(
    "text",
    [
      legendX,
      legendTop,
      () =>
        flatSecant
          ? `secant (f(a) = f(b)): slope ${format(secantSlope())}`
          : `secant — average slope ${format(secantSlope())}`,
    ],
    { ...legendStyle, strokeColor: BOARD_COLORS.secant },
  );

  board.create(
    "text",
    [
      legendX,
      legendTop - legendGap,
      () => `tangent at ${labels.c} — f'(${labels.c}) = ${format(df(valueC()))}`,
    ],
    { ...legendStyle, strokeColor: BOARD_COLORS.tangent },
  );

  // Keep the secant behind the curve so the tangent reads clearly.
  secant.setAttribute({ layer: 5 });
}

function format(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}
