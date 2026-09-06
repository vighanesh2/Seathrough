export {
  topicBoardIdSchema,
  topicBoardParamsSchema,
  topicIdSchema,
  type BoardPoint,
  type BoundingBox,
  type ConstructionBoardParams,
  type FunctionGraphBoardParams,
  type OdeSolutionBoardParams,
  type SecantTangentBoardParams,
  type TopicBoardId,
  type TopicBoardParams,
  type TopicId,
} from "@/lib/topics/schema";
export {
  CATALOG_ENTRIES,
  getCatalogEntry,
  listCatalogEntries,
} from "@/lib/topics/catalog";
export type { CatalogEntry } from "@/lib/topics/catalog/types";
export type { TopicModule, TopicStep } from "@/lib/topics/types";
export {
  boundingBoxForPoints,
  parseInterval,
  remapPointsToInterval,
  solveParallelPoint,
  type Interval,
} from "@/lib/topics/geometry";
export {
  defaultOdeParams,
  isSafeOdeExpression,
  parseOdeFromPrompt,
} from "@/lib/topics/odeParse";
export {
  cleanFunctionExpression,
  extractFunctionExpression,
  listNamedCurveExpressions,
  parseFunctionGraphFromPrompt,
  wantsFunctionGraph,
} from "@/lib/topics/functionParse";
export {
  resolveTopicPresentation,
  type TopicPresentation,
} from "@/lib/topics/presentation";
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
export {
  activeTopicStepIndex,
  buildTopicLessonPlan,
  revealedTopicSteps,
} from "@/lib/topics/topicLesson";
