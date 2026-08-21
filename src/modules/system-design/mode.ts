import type { ModeDefinition } from "@/modes/types";

/** Architecture diagrams from the Excalidraw system-design library. */
export const systemDesignMode: ModeDefinition = {
  id: "system-design",
  href: "/system-design",
  navLabel: "Systems",
  title: "System design",
  description:
    "Describe an architecture. Watch services, stores, and traffic assemble on the board.",
  kind: "learning",
  group: "studio",
  order: 20,
  enabled: true,
  usesWhiteboard: false,
  metaTitle: "System design | SeeThrough",
  metaDescription:
    "Describe a system — load balancers, caches, queues — and watch the architecture draw itself.",
};
