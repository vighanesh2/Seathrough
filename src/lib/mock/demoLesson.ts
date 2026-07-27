import type { LessonPlan } from "@/types/lesson";

/** Offline demo — curated template + anchor actions. */
export const demoLesson: LessonPlan = {
  title: "What is a class?",
  language: "java",
  beats: [
    {
      id: "b1",
      order: 1,
      kind: "intro",
      narration:
        "Think of a class as a classroom — a named place that holds related things together.",
      imageAction: "generate",
      visual: {
        renderer: "template",
        assetId: "classroom-blueprint",
        actions: [
          { type: "draw" },
          { type: "label", anchor: "classroom", text: "classroom" },
          { type: "label", anchor: "object", text: "Car" },
        ],
      },
      paceHintMs: 2200,
    },
    {
      id: "b2",
      order: 2,
      kind: "token",
      codeDelta: "public ",
      highlight: "public",
      narration:
        "public is an access modifier — it says this class can be seen from outside.",
      imageAction: "keep",
      visual: {
        renderer: "template",
        assetId: "classroom-blueprint",
        actions: [{ type: "highlight", anchor: "door" }],
      },
      paceHintMs: 2000,
    },
  ],
  humanSummary:
    "I need a named container for the idea of a car.\nSo I declare a class — a blueprint.",
};
