import type { ModeDefinition } from "@/modes/types";

/** Lab: raw draw-engine SSE → Konva command stream. */
export const drawEngineMode: ModeDefinition = {
  id: "draw-engine",
  href: "/draw-engine",
  navLabel: "Draw Engine",
  title: "Draw Engine",
  description: "Timed Konva command stream for board-engine experiments.",
  kind: "tool",
  order: 110,
  enabled: true,
  badge: "lab",
  usesWhiteboard: true,
  metaTitle: "Draw Engine | SeeThrough",
  metaDescription:
    "Client Konva draw engine fed by a timed SSE command stream.",
};
