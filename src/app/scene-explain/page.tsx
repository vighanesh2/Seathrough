import type { Metadata } from "next";
import { Workspace } from "@/modules/scene-explain";
import { sceneExplainMode } from "@/modules/scene-explain/mode";

export const metadata: Metadata = {
  title: sceneExplainMode.metaTitle,
  description: sceneExplainMode.metaDescription,
};

export default function SceneExplainPage() {
  return (
    <Workspace />
  );
}
