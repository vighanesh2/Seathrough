import type { TopicBoardParams } from "@/lib/topics";

/** The JSXGraph namespace, as returned by a dynamic import. */
export type JxgStatic = typeof import("jsxgraph");

export type JxgBoard = import("jsxgraph").Board;

export type TopicBoardContext = {
  JXG: JxgStatic;
  board: JxgBoard;
  params: TopicBoardParams;
};

/**
 * Draws one topic onto an already-created board. The host component owns the
 * board's lifecycle, so a drawer never has to clean up after itself.
 */
export type TopicBoardDrawer = (ctx: TopicBoardContext) => void;

/** Board palette, matched to the app's chalk-board tokens in globals.css. */
export const BOARD_COLORS = {
  curve: "#1e3a5f",
  secant: "#b8431e",
  tangent: "#0f4f7c",
  point: "#1b6ca8",
  muted: "#6a7d90",
  grid: "#c8d6e4",
} as const;
