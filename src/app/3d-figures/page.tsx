import type { Metadata } from "next";
import { AnatomyWorkspace } from "@/components/anatomy/AnatomyWorkspace";

export const metadata: Metadata = {
  title: "3D Figures: Heart and Lungs | SeeThrough",
  description:
    "Explore an animated, source-grounded 3D model of normal heart and lung physiology.",
};

export default function ThreeDFiguresPage() {
  return <AnatomyWorkspace />;
}
