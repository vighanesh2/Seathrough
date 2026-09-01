export {
  topicBoardIdSchema,
  topicBoardParamsSchema,
  topicIdSchema,
  type BoardPoint,
  type BoundingBox,
  type TopicBoardId,
  type TopicBoardParams,
  type TopicId,
} from "@/lib/topics/schema";
export type { TopicModule, TopicStep } from "@/lib/topics/types";
export {
  boundingBoxForPoints,
  parseInterval,
  remapPointsToInterval,
  solveParallelPoint,
  type Interval,
} from "@/lib/topics/geometry";
export {
  TOPIC_MODULES,
  getTopicModule,
  hasTopicFor,
  listTopicIds,
  listTopicSummaries,
  matchTopic,
} from "@/lib/topics/registry";
export {
  topicVisualPlan,
  topicVisualPlanById,
  topicVisualPlanFor,
  topicQuestionContext,
} from "@/lib/topics/plan";
