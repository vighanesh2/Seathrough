import type { LessonBeatParsed, LessonPlanParsed } from "@/lib/schemas/lesson";
import { resolveTopicPresentation } from "@/lib/topics/presentation";
import type { TopicModule } from "@/lib/topics/types";

function topicBeat(
  topic: TopicModule,
  presentationTitle: string,
  beat: Pick<LessonBeatParsed, "id" | "order" | "kind" | "narration"> &
    Partial<LessonBeatParsed>,
): LessonBeatParsed {
  return {
    actions: [],
    imageAction: beat.order === 1 ? "generate" : "keep",
    conceptKey: presentationTitle,
    ...beat,
  };
}

/**
 * Replace the LLM beat list with a short walkthrough tailored to this
 * question (dynamic title / steps when the topic implements `present()`).
 */
export function buildTopicLessonPlan(
  plan: LessonPlanParsed,
  topic: TopicModule,
  prompt = "",
): LessonPlanParsed {
  const params = topic.deriveParams(prompt);
  const presentation = resolveTopicPresentation(topic, params, prompt);

  const beats: LessonBeatParsed[] = [
    topicBeat(topic, presentation.title, {
      id: `${topic.id}-intro`,
      order: 1,
      kind: "intro",
      narration: `${presentation.summary} Take a moment with the graph — the steps below will build on it.`,
    }),
    ...presentation.steps.map((step, index) =>
      topicBeat(topic, presentation.title, {
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
      topicBeat(topic, presentation.title, {
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
    title: presentation.title,
    beats,
    humanSummary: plan.humanSummary || presentation.summary,
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
