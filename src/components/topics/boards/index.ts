import { drawConstruction } from "@/components/topics/boards/construction";
import { drawFunctionGraph } from "@/components/topics/boards/functionGraph";
import { drawOdeSolution } from "@/components/topics/boards/odeSolution";
import { drawSecantTangent } from "@/components/topics/boards/secantTangent";
import type { TopicBoardDrawer } from "@/components/topics/boards/types";
import type { TopicBoardId } from "@/lib/topics";

/**
 * Which drawing routine backs each `boardId`.
 * `function-graph` plots any safe y = f(x) from the question.
 * `construction` runs curated catalog examples (data-only).
 */
export const TOPIC_BOARDS: Record<TopicBoardId, TopicBoardDrawer> = {
  "secant-tangent": drawSecantTangent,
  "ode-solution": drawOdeSolution,
  construction: drawConstruction,
  "function-graph": drawFunctionGraph,
};

export { BOARD_COLORS } from "@/components/topics/boards/types";
export type {
  JxgBoard,
  JxgStatic,
  TopicBoardContext,
  TopicBoardDrawer,
} from "@/components/topics/boards/types";
