import { meanValueTheoremTopic } from "@/lib/topics/modules/meanValueTheorem";
import { rollesTheoremTopic } from "@/lib/topics/modules/rollesTheorem";
import { topicIdSchema, type TopicId } from "@/lib/topics/schema";
import type { TopicModule } from "@/lib/topics/types";

/**
 * Every interactive topic the app can teach, most specific first — the first
 * module whose matcher fires wins.
 *
 * To add a topic: write a module, import it here, and give it a board in
 * `@/components/topics/boards` (or reuse an existing `boardId`).
 */
export const TOPIC_MODULES: readonly TopicModule[] = [
  meanValueTheoremTopic,
  rollesTheoremTopic,
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

  for (const topic of TOPIC_MODULES) {
    if (topic.matches(prompt, conceptKey)) return topic;
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
