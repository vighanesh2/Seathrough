import type { ModeDefinition } from "@/modes/types";

/** Agent-built Three.js scenes for any process the student asks about. */
export const sceneExplainMode: ModeDefinition = {
  id: "scene-explain",
  href: "/scene-explain",
  navLabel: "3D scenes",
  title: "3D scene explanation",
  description:
    "Ask for osmosis, orbits, anything spatial. An agent builds a live 3D scene and explains it.",
  kind: "learning",
  group: "studio",
  order: 30,
  enabled: true,
  badge: "new",
  usesWhiteboard: false,
  metaTitle: "3D scene explanation | SeeThrough",
  metaDescription:
    "Watch any scientific process in 3D. An agent builds the scene, repairs crashes, and explains it as it plays.",
};
