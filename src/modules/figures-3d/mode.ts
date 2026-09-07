import type { ModeDefinition } from "@/modes/types";

/** Interactive 3D heart and eye anatomy. */
export const figures3dMode: ModeDefinition = {
  id: "figures-3d",
  href: "/3d-figures",
  navLabel: "Human anatomy",
  title: "Human anatomy",
  description: "Explore the heart and the human eye in 3D, then ask what a part does.",
  kind: "learning",
  group: "studio",
  order: 20,
  enabled: true,
  usesWhiteboard: false,
  metaTitle: "Human anatomy | SeeThrough",
  metaDescription:
    "Explore animated heart and eye models with clear answers.",
};
