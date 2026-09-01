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
  return {
    renderer: "jsxgraph",
    topicId: topic.id,
    topicParams: topic.deriveParams(context),
    source: topic.id,
    formula: topic.formula,
    actions: [],
  };
}

/** Plan for a question, when the topic library covers it. */
export function topicVisualPlanFor(
  prompt: string,
  conceptKey?: string,
  extra?: string,
): VisualPlan | null {
  const context = topicQuestionContext(prompt, conceptKey, extra);
  const topic = matchTopic(prompt, conceptKey) ?? matchTopic(context);
  return topic ? topicVisualPlan(topic, prompt, conceptKey, extra) : null;
}

/** Plan for a topic requested by id — for pages that pick a topic directly. */
export function topicVisualPlanById(
  id: string,
  prompt = "",
): VisualPlan | null {
  const topic = getTopicModule(id);
  return topic ? topicVisualPlan(topic, prompt) : null;
}
