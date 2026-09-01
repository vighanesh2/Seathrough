import { drawOdeSolution } from "@/components/topics/boards/odeSolution";
import { drawSecantTangent } from "@/components/topics/boards/secantTangent";
import type { TopicBoardDrawer } from "@/components/topics/boards/types";
import type { TopicBoardId } from "@/lib/topics";

/**
 * Which drawing routine backs each `boardId`. Topics that share a picture —
 * the Mean Value Theorem and Rolle's theorem, say — share an entry here and
 * differ only by their parameters.
 */
export const TOPIC_BOARDS: Record<TopicBoardId, TopicBoardDrawer> = {
  "secant-tangent": drawSecantTangent,
  "ode-solution": drawOdeSolution,
};

export { BOARD_COLORS } from "@/components/topics/boards/types";
export type {
  JxgBoard,
  JxgStatic,
  TopicBoardContext,
  TopicBoardDrawer,
} from "@/components/topics/boards/types";
