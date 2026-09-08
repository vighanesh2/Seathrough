import type {
  TopicBoardId,
  TopicBoardParams,
  TopicId,
} from "@/lib/topics/schema";
import type { TopicPresentation } from "@/lib/topics/presentation";

/** One line of the written explanation that sits beside the board. */
export type TopicStep = {
  title: string;
  detail: string;
};

/**
 * A self-contained lesson topic: how to recognise it in a question, what to
 * say about it, and how to parameterise its interactive board.
 *
 * Dynamic topics implement `present()` so title / formula / steps match the
 * actual question (e.g. y = x^3), not a static placeholder.
 */
export type TopicModule = {
  id: TopicId;
  /** Which interactive board draws this topic. Boards are shared. */
  boardId: TopicBoardId;
  title: string;
  /** One sentence shown under the board. */
  summary: string;
  /** KaTeX, rendered in the formula strip. */
  formula: string;
  /** Phrasings a learner might type. Also feeds the topic catalogue. */
  aliases: string[];
  steps: TopicStep[];
  defaultParams: TopicBoardParams;
  /**
   * Tailor the board to the question — e.g. honour an interval the learner
   * asked about. Must fall back to `defaultParams` when nothing is stated.
   */
  deriveParams: (prompt: string) => TopicBoardParams;
  matches: (prompt: string, conceptKey?: string) => boolean;
  /**
   * Optional live copy for this question/params. When omitted, the static
   * title / summary / formula / steps above are used.
   */
  present?: (input: {
    prompt?: string;
    params: TopicBoardParams;
  }) => TopicPresentation;
};

export type {
  BoardPoint,
  BoundingBox,
  TopicBoardId,
  TopicBoardParams,
  TopicId,
} from "@/lib/topics/schema";
export type { TopicPresentation } from "@/lib/topics/presentation";
