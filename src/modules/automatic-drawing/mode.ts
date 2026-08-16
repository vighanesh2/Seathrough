import type { ModeDefinition } from "@/modes/types";

/** Lab: prompt-driven automatic drawing whiteboard. */
export const automaticDrawingMode: ModeDefinition = {
  id: "automatic-drawing",
  href: "/automatic-drawing",
  navLabel: "Auto Draw",
  title: "Automatic Drawing",
  description: "Prompt the whiteboard and watch a drawing plan execute.",
  kind: "tool",
  order: 100,
  enabled: true,
  badge: "lab",
  usesWhiteboard: true,
  metaTitle: "Automatic Drawing | SeeThrough",
  metaDescription: "Prompt SeeThrough’s whiteboard and watch it draw automatically.",
};
