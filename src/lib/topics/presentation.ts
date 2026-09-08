import type { TopicBoardParams } from "@/lib/topics/schema";
import type { TopicModule, TopicStep } from "@/lib/topics/types";

/** What the learner sees for a topic — can change with the question. */
export type TopicPresentation = {
  title: string;
  summary: string;
  formula: string;
  steps: TopicStep[];
};

export function staticPresentation(topic: TopicModule): TopicPresentation {
  return {
    title: topic.title,
    summary: topic.summary,
    formula: topic.formula,
    steps: topic.steps,
  };
}

/**
 * Resolve the live lesson copy for a topic. Prefer `present()` when the module
 * knows how to describe the current params (e.g. y = x^3 vs a generic label).
 */
export function resolveTopicPresentation(
  topic: TopicModule,
  params: TopicBoardParams,
  prompt?: string,
): TopicPresentation {
  if (topic.present) {
    return topic.present({ prompt, params });
  }
  return staticPresentation(topic);
}
