import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { Workspace } from "@/modules/scene-explain";
import { sceneExplainMode } from "@/modules/scene-explain/mode";

export const metadata: Metadata = {
  title: sceneExplainMode.metaTitle,
  description: sceneExplainMode.metaDescription,
};

export default function SceneExplainPage() {
  return (
    <AuthGate
      title="3D scene explanation"
      description="Sign in to build a live 3D scene and hear it explained as it plays."
    >
      <Workspace />
    </AuthGate>
  );
}
