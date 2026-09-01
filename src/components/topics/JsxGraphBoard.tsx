"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import "@/components/topics/jsxgraph.css";
import {
  BOARD_COLORS,
  TOPIC_BOARDS,
  type JxgBoard,
  type JxgStatic,
} from "@/components/topics/boards";
import type { TopicBoardId, TopicBoardParams } from "@/lib/topics";
import { cn } from "@/lib/utils";

type JsxGraphBoardProps = {
  boardId: TopicBoardId;
  params: TopicBoardParams;
  className?: string;
  ariaLabel?: string;
  /** Fired once the board has been drawn, so a lesson beat can advance. */
  onReady?: () => void;
};

const AXIS_TICKS = {
  strokeColor: BOARD_COLORS.grid,
  majorHeight: 8,
  minorHeight: 4,
  label: { fontSize: 11, strokeColor: BOARD_COLORS.muted },
} as const;

/**
 * Mounts one interactive JSXGraph board and tears it down cleanly.
 *
 * JSXGraph writes directly to the DOM and expects a browser, so this component
 * must only ever be reached through a dynamic import with `ssr: false`.
 */
export function JsxGraphBoard({
  boardId,
  params,
  className,
  ariaLabel,
  onReady,
}: JsxGraphBoardProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const draw = TOPIC_BOARDS[boardId];

  const reactId = useId();
  const domId = useMemo(
    () => `jxg-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`,
    [reactId],
  );

  // Rebuild only when the picture actually changes, not on every render.
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let cancelled = false;
    let board: JxgBoard | null = null;
    let jxg: JxgStatic | null = null;

    if (!draw) return;

    void (async () => {
      try {
        const imported: unknown = await import("jsxgraph");
        // The package ships `export = JXG` types over an ESM default export.
        const JXG = ((imported as { default?: JxgStatic }).default ??
          imported) as JxgStatic;

        if (cancelled || !hostRef.current) return;

        jxg = JXG;
        board = JXG.JSXGraph.initBoard(hostRef.current, {
          boundingbox: paramsRef.current.boundingBox,
          axis: true,
          keepaspectratio: true,
          showCopyright: false,
          showNavigation: true,
          pan: { enabled: true, needTwoFingers: true },
          // Shift-to-zoom so the board never steals the page scroll.
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
          draw({ JXG, board, params: paramsRef.current });
        } finally {
          board.unsuspendUpdate();
        }

        onReadyRef.current?.();
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
          /* the board is going away with the DOM node anyway */
        }
      }
      board = null;
    };
  }, [draw, paramsKey]);

  if (!draw || loadFailed) {
    return (
      <div
        className={cn(
          "flex h-full min-h-[280px] w-full items-center justify-center rounded-xl border border-board-edge bg-chalk p-6 text-center font-sans text-sm text-muted",
          className,
        )}
      >
        This interactive graph could not load.
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      id={domId}
      role="img"
      aria-label={ariaLabel ?? "Interactive graph"}
      className={cn(
        "jxgbox h-full min-h-[280px] w-full rounded-xl border border-board-edge bg-chalk",
        className,
      )}
    />
  );
}
