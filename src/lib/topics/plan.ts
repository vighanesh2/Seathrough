import {
  defaultFunctionGraphParams,
  parseFunctionGraphFromPrompt,
} from "@/lib/topics/functionParse";
import { resolveTopicPresentation } from "@/lib/topics/presentation";
import { getTopicModule, matchTopic } from "@/lib/topics/registry";
import type { TopicModule } from "@/lib/topics/types";
import type { VisualPlan } from "@/lib/visuals/types";

/** Everything a topic module might read when tailoring the board. */
export function topicQuestionContext(
  prompt: string,
  conceptKey?: string,
  extra?: string,
): string {
  return [prompt, conceptKey, extra].filter(Boolean).join(" ").trim();
}

/**
 * Turn a topic into the plan shape the rest of the app already renders and
 * caches. Only data crosses this boundary; the board itself is looked up on
 * the client by `topicId`.
 */
export function topicVisualPlan(
  topic: TopicModule,
  prompt: string,
  conceptKey?: string,
  extra?: string,
): VisualPlan {
  const context = topicQuestionContext(prompt, conceptKey, extra);
  const topicParams =
    topic.id === "function-graph"
      ? parseFunctionGraphFromPrompt(prompt) ??
        parseFunctionGraphFromPrompt(context) ??
        defaultFunctionGraphParams()
      : topic.deriveParams(context);
  const presentation = resolveTopicPresentation(topic, topicParams, prompt);
  return {
    renderer: "jsxgraph",
    topicId: topic.id,
    topicParams,
    source: topic.id,
    formula: presentation.formula,
    actions: [],
  };
}

/** Plan for a question, when the topic library covers it. */
export function topicVisualPlanFor(
  prompt: string,
  conceptKey?: string,
  extra?: string,
): VisualPlan | null {
  const topic =
    matchTopic(prompt) ??
    matchTopic(prompt, conceptKey) ??
    matchHintTopic(prompt, extra);
  return topic ? topicVisualPlan(topic, prompt, conceptKey, extra) : null;
}

/** Root-prompt / title hints only — never a full narration sentence. */
function matchHintTopic(
  prompt: string,
  extra?: string,
): TopicModule | null {
  const hint = extra?.trim() ?? "";
  if (!hint || hint.length > 160 || /[.!?]/.test(hint)) return null;
  return matchTopic(hint) ?? matchTopic(prompt, hint);
}

/** Plan for a topic requested by id — for pages that pick a topic directly. */
export function topicVisualPlanById(
  id: string,
  prompt = "",
): VisualPlan | null {
  const topic = getTopicModule(id);
  return topic ? topicVisualPlan(topic, prompt) : null;
}
