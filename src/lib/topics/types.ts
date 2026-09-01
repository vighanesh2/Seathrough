import type {
  TopicBoardId,
  TopicBoardParams,
  TopicId,
} from "@/lib/topics/schema";

/** One line of the written explanation that sits beside the board. */
export type TopicStep = {
  title: string;
  detail: string;
};

/**
 * A self-contained lesson topic: how to recognise it in a question, what to
 * say about it, and how to parameterise its interactive board.
 *
 * Adding a topic means adding one of these plus (if it needs a new board) one
 * drawer in `@/components/topics/boards`. Nothing else has to change.
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
};

export type {
  BoardPoint,
  BoundingBox,
  TopicBoardId,
  TopicBoardParams,
  TopicId,
} from "@/lib/topics/schema";
