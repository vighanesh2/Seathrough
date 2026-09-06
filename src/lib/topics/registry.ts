import { catalogTopicModules } from "@/lib/topics/catalog";
import { differentialEquationsTopic } from "@/lib/topics/modules/differentialEquations";
import { functionGraphTopic } from "@/lib/topics/modules/functionGraph";
import { meanValueTheoremTopic } from "@/lib/topics/modules/meanValueTheorem";
import { rollesTheoremTopic } from "@/lib/topics/modules/rollesTheorem";
import { topicIdSchema, type TopicId } from "@/lib/topics/schema";
import type { TopicModule } from "@/lib/topics/types";

/**
 * Hand-tuned interactives first (most specific), then the generic function
 * grapher, then the JSXGraph example catalog.
 */
export const TOPIC_MODULES: readonly TopicModule[] = [
  differentialEquationsTopic,
  meanValueTheoremTopic,
  rollesTheoremTopic,
  functionGraphTopic,
  ...catalogTopicModules(),
];

const BY_ID = new Map<TopicId, TopicModule>(
  TOPIC_MODULES.map((topic) => [topic.id, topic]),
);

/** Look a topic up by id — safe to call with an untrusted/cached string. */
export function getTopicModule(id: string | null | undefined): TopicModule | null {
  if (!id) return null;
  const parsed = topicIdSchema.safeParse(id);
  return parsed.success ? (BY_ID.get(parsed.data) ?? null) : null;
}

/** The topic a question is asking about, or null to fall back to the generic path. */
export function matchTopic(
  prompt: string,
  conceptKey?: string,
): TopicModule | null {
  if (!prompt.trim() && !conceptKey?.trim()) return null;

  // The live question wins. Mixing in a beat concept key / recap used to
  // poison formula parsers (y = x^4 + "even functions and…").
  if (prompt.trim()) {
    for (const topic of TOPIC_MODULES) {
      if (topic.matches(prompt)) return topic;
    }
  }

  if (conceptKey?.trim()) {
    for (const topic of TOPIC_MODULES) {
      if (topic.matches(prompt, conceptKey)) return topic;
    }
  }
  return null;
}

export function hasTopicFor(prompt: string, conceptKey?: string): boolean {
  return matchTopic(prompt, conceptKey) !== null;
}

export function listTopicIds(): TopicId[] {
  return TOPIC_MODULES.map((topic) => topic.id);
}

/** Compact catalogue for menus, suggestion chips, and planner prompts. */
export function listTopicSummaries(): Array<{
  id: TopicId;
  title: string;
  summary: string;
  aliases: string[];
}> {
  return TOPIC_MODULES.map((topic) => ({
    id: topic.id,
    title: topic.title,
    summary: topic.summary,
    aliases: [...topic.aliases],
  }));
}
