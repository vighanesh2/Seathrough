export { makeTopicKey, displayLabelFromKey } from "@/lib/visuals/library/topicKey";
export {
  classifyVisualPlan,
  shouldGrowLibrary,
  type VisualRouteQuality,
} from "@/lib/visuals/library/classify";
export { buildLearnedVisualPlan } from "@/lib/visuals/library/proceduralPlan";
export {
  buildBoardScriptPlan,
  isWeakVisualPlan,
  peekHeuristicBoardScript,
} from "@/lib/visuals/library/boardScriptPlan";
export {
  lookupVisualLibrary,
  rememberVisualLibrary,
  clearVisualLibraryMemory,
  type VisualLibraryEntry,
} from "@/lib/visuals/library/store";
export { resolveVisualWithLibrary } from "@/lib/visuals/library/resolve";
export {
  revealThroughStepIndex,
  stepsForBeat,
  spokenLinesForBeat,
  narrationMatchingBoard,
} from "@/lib/visuals/library/scriptReveal";
export {
  isIntegralAreaTopic,
  isLimitGraphTopic,
  isGraphBoardTopic,
  isMatrixMultiplyTopic,
} from "@/lib/visuals/library/topicMatch";
