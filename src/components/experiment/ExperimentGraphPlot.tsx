"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import "@/components/topics/jsxgraph.css";
import { BOARD_COLORS, type JxgBoard, type JxgStatic } from "@/components/topics/boards";
import { boundingBoxForGraph, type ExperimentGraph } from "@/lib/experiment/graph";
import { drawFunctionGraph } from "@/components/topics/boards/functionGraph";

type ExperimentGraphPlotProps = {
  graph: ExperimentGraph;
};

const AXIS_TICKS = {
  strokeColor: BOARD_COLORS.grid,
  majorHeight: 8,
  minorHeight: 4,
  label: { fontSize: 11, strokeColor: BOARD_COLORS.muted },
} as const;

/**
 * JSXGraph plot for an experiment lesson — a real y = f(x) curve and/or data points.
 */
export function ExperimentGraphPlot({ graph }: ExperimentGraphPlotProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const reactId = useId();
  const domId = useMemo(
    () => `jxg-exp-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`,
    [reactId],
  );
  const graphKey = useMemo(() => JSON.stringify(graph), [graph]);

  useEffect(() => {
    let cancelled = false;
    let board: JxgBoard | null = null;
    let jxg: JxgStatic | null = null;

    void (async () => {
      try {
        const imported: unknown = await import("jsxgraph");
        const JXG = ((imported as { default?: JxgStatic }).default ??
          imported) as JxgStatic;
        if (cancelled || !hostRef.current) return;

        jxg = JXG;
        const box = boundingBoxForGraph(graph);
        board = JXG.JSXGraph.initBoard(hostRef.current, {
          boundingbox: box,
          axis: true,
          keepaspectratio: false,
          showCopyright: false,
          showNavigation: true,
          pan: { enabled: true, needTwoFingers: true },
          zoom: { wheel: true, needShift: true },
          resize: { enabled: true, throttle: 200 },
          defaultAxes: {
            x: { strokeColor: BOARD_COLORS.muted, ticks: AXIS_TICKS },
            y: { strokeColor: BOARD_COLORS.muted, ticks: AXIS_TICKS },
          },
        });

        if (cancelled) {
          JXG.JSXGraph.freeBoard(board);
          board = null;
          return;
        }

        board.suspendUpdate();
        try {
          if (graph.expression) {
            const xMin = box[0] + (box[2] - box[0]) * 0.04;
            const xMax = box[2] - (box[2] - box[0]) * 0.04;
            drawFunctionGraph({
              JXG,
              board,
              params: {
                boardKind: "function-graph",
                boundingBox: box,
                expression: graph.expression,
                showTangent: graph.showTangent === true,
                xMin: /\b(ln|log|sqrt)\b/i.test(graph.expression)
                  ? Math.max(0.05, xMin)
                  : xMin,
                xMax,
              },
            });
          }

          if (graph.points.length >= 2) {
            const plotted = graph.points.map((point) =>
              board!.create("point", [point.x, point.y], {
                name: point.label ?? "",
                size: 3,
                strokeColor: BOARD_COLORS.point,
                fillColor: BOARD_COLORS.point,
                withLabel: Boolean(point.label),
                label: { fontSize: 12, strokeColor: BOARD_COLORS.curve },
              }),
            );
            if (!graph.expression) {
              for (let i = 1; i < plotted.length; i += 1) {
                board!.create("segment", [plotted[i - 1], plotted[i]], {
                  strokeColor: BOARD_COLORS.curve,
                  strokeWidth: 2.5,
                  highlight: false,
                });
              }
            }
          }

          const caption = graph.title || (graph.xLabel && graph.yLabel
            ? `${graph.yLabel} vs ${graph.xLabel}`
            : "");
          if (caption && !graph.expression) {
            board.create(
              "text",
              [box[0] + 0.3, box[1] - 0.4, caption],
              {
                fontSize: 14,
                fixed: true,
                highlight: false,
                strokeColor: BOARD_COLORS.curve,
              },
            );
          }
        } finally {
          board.unsuspendUpdate();
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (board && jxg) {
        try {
          jxg.JSXGraph.freeBoard(board);
        } catch {
          /* host is unmounting */
        }
      }
    };
  }, [graph, graphKey]);

  if (loadFailed) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-board-edge bg-white text-sm text-muted">
        The graph could not load.
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      id={domId}
      role="img"
      aria-label={graph.title || "Graph"}
      className="jxgbox h-full min-h-[280px] w-full rounded-2xl border border-board-edge bg-white shadow-[0_16px_40px_rgba(26,43,60,0.1)]"
    />
  );
}
