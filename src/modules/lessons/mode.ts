import type { ModeDefinition } from "@/modes/types";

/** Whiteboard lessons — prompt → stream → board + teacher narration. */
export const lessonsMode: ModeDefinition = {
  id: "lessons",
  href: "/lessons",
  navLabel: "Topics",
  title: "Topic explanation",
  description:
    "Ask what you’re stuck on. A tutor draws it on the board and talks you through it.",
  kind: "learning",
  group: "studio",
  order: 10,
  enabled: true,
  usesWhiteboard: true,
  metaTitle: "Topic explanation | SeeThrough",
  metaDescription:
    "Ask any topic — watch it drawn on a whiteboard with a clear spoken explanation.",
};
