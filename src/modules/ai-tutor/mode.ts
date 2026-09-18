import type { ModeDefinition } from "@/modes/types";

/** Guided mix-up tutor with playable visuals from the Python teaching loop. */
export const aiTutorMode: ModeDefinition = {
  id: "ai-tutor",
  href: "/ai-tutor",
  navLabel: "Guided tutor",
  title: "Guided tutor",
  description:
    "Answer a few questions. When a mix-up shows up, a picture explains it. We only stop when you can use the idea.",
  kind: "learning",
  group: "studio",
  order: 12,
  enabled: true,
  badge: "new",
  usesWhiteboard: false,
  metaTitle: "Guided tutor | SeeThrough",
  metaDescription:
    "A calm tutor that finds mix-ups, draws them, and checks you understood with a new question.",
};
