import type { ModeDefinition } from "@/modes/types";

/** Architecture diagrams from the Excalidraw system-design library. */
export const systemDesignMode: ModeDefinition = {
  id: "system-design",
  href: "/system-design",
  navLabel: "System design",
  title: "System design",
  description:
    "Ask for a system. Each diagram stays on the board, from the architecture down to what happens when it fails.",
  kind: "learning",
  group: "studio",
  order: 3,
  enabled: true,
  usesWhiteboard: false,
  metaTitle: "System design | SeeThrough",
  metaDescription:
    "Watch a system design stay on one board: architecture, data, the request, and what happens when someone is offline.",
};
