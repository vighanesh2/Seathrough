import type { ModeDefinition } from "@/modes/types";

/** Interactive 3D anatomy figures with grounded Q&A. */
export const figures3dMode: ModeDefinition = {
  id: "figures-3d",
  href: "/3d-figures",
  navLabel: "3D body",
  title: "Explore the body",
  description: "Spin through heart, lungs, or eye — then ask what a part does.",
  kind: "learning",
  group: "more",
  order: 60,
  enabled: true,
  usesWhiteboard: false,
  metaTitle: "Explore the body | SeeThrough",
  metaDescription:
    "Explore animated heart, lung, and eye models with clear answers.",
};
