import type { ModeDefinition } from "@/modes/types";

/** Whiteboard lessons — prompt → stream → board + teacher narration. */
export const lessonsMode: ModeDefinition = {
  id: "lessons",
  href: "/lessons",
  navLabel: "Lesson",
  title: "Ask a question",
  description: "Type what you’re stuck on. We’ll draw and explain it step by step.",
  kind: "learning",
  order: 10,
  enabled: true,
  usesWhiteboard: true,
  metaTitle: "Ask a question | SeeThrough",
  metaDescription:
    "Ask anything — watch it drawn on a whiteboard with a clear spoken explanation.",
};
