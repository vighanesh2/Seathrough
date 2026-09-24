import type { ModeDefinition } from "@/modes/types";

/** Saved Smart tutor lessons as watchable videos. */
export const dashboardMode: ModeDefinition = {
  id: "dashboard",
  href: "/dashboard",
  navLabel: "Dashboard",
  title: "Dashboard",
  description:
    "Watch lessons you saved from Smart tutor. Titles are written for you; rename any of them.",
  kind: "learning",
  group: "studio",
  order: 2,
  enabled: true,
  usesWhiteboard: false,
  metaTitle: "Dashboard | SeeThrough",
  metaDescription:
    "Your saved Smart tutor lessons as videos, with titles you can rename.",
};
