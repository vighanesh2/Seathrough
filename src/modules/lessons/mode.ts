import type { ModeDefinition } from "@/modes/types";

/** Whiteboard lessons — prompt → stream → board + teacher narration. */
export const lessonsMode: ModeDefinition = {
  id: "lessons",
  href: "/lessons",
  navLabel: "Topics",
  title: "Topics",
  description:
    "Ask what you’re stuck on. A tutor draws it on the board and talks you through it.",
  kind: "learning",
  group: "studio",
  order: 10,
  enabled: true,
  usesWhiteboard: true,
  metaTitle: "Topics | SeeThrough",
  metaDescription:
    "Ask any topic. SeeThrough draws it on the board while it explains.",
};
