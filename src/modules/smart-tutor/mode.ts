import type { ModeDefinition } from "@/modes/types";

/** Isolated whiteboard tutor (tldraw + spoken checks). */
export const smartTutorMode: ModeDefinition = {
  id: "smart-tutor",
  href: "/smart-tutor",
  navLabel: "Smart tutor",
  title: "Smart tutor",
  description:
    "Ask a question. The tutor talks in short steps, draws on the board, then checks you understood.",
  kind: "learning",
  group: "studio",
  order: 1,
  enabled: true,
  badge: "new",
  usesWhiteboard: true,
  metaTitle: "Smart tutor | SeeThrough",
  metaDescription:
    "Ask any question. SeeThrough draws it on the board, talks you through it, and checks you understood.",
};
