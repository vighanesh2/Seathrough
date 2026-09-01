import type { LessonBeatParsed, LessonPlanParsed } from "@/lib/schemas/lesson";
import type { TopicModule } from "@/lib/topics/types";

function topicBeat(
  topic: TopicModule,
  beat: Pick<LessonBeatParsed, "id" | "order" | "kind" | "narration"> &
    Partial<LessonBeatParsed>,
): LessonBeatParsed {
  return {
    actions: [],
    imageAction: beat.order === 1 ? "generate" : "keep",
    conceptKey: topic.title,
    ...beat,
  };
}

/**
 * Replace the LLM beat list with a short, fixed walkthrough:
 * beat 1 = graph only, beats 2…N+1 = one topic step each, optional recap last.
 */
export function buildTopicLessonPlan(
  plan: LessonPlanParsed,
  topic: TopicModule,
): LessonPlanParsed {
  const beats: LessonBeatParsed[] = [
    topicBeat(topic, {
      id: `${topic.id}-intro`,
      order: 1,
      kind: "intro",
      narration: `${topic.summary} Take a moment with the graph — the steps below will build on it.`,
    }),
    ...topic.steps.map((step, index) =>
      topicBeat(topic, {
        id: `${topic.id}-step-${index + 1}`,
        order: index + 2,
        kind: "token",
        narration: `${step.title}. ${step.detail}`,
      }),
    ),
  ];

  const recap =
    plan.beats.find((b) => b.kind === "human_summary" || b.kind === "recap") ??
    plan.beats.at(-1);
  if (recap?.narration?.trim()) {
    beats.push(
      topicBeat(topic, {
        ...recap,
        id: `${topic.id}-recap`,
        order: beats.length + 1,
        kind: "recap",
        narration: recap.narration,
      }),
    );
  }

  return {
    ...plan,
    title: topic.title,
    beats,
    humanSummary: plan.humanSummary || topic.summary,
  };
}

/** How many topic steps should be visible after this beat (graph-first). */
export function revealedTopicSteps(beatOrder: number, stepCount: number): number {
  if (beatOrder <= 1 || stepCount <= 0) return 0;
  return Math.min(beatOrder - 1, stepCount);
}

/** Which step index is currently being narrated (-1 during the intro beat). */
export function activeTopicStepIndex(beatOrder: number, stepCount: number): number {
  if (beatOrder <= 1) return -1;
  return Math.min(beatOrder - 2, stepCount - 1);
}
