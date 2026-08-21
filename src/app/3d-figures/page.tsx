import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { Workspace } from "@/modules/figures-3d";
import { figures3dMode } from "@/modules/figures-3d/mode";

export const metadata: Metadata = {
  title: figures3dMode.metaTitle,
  description: figures3dMode.metaDescription,
};

export default function ThreeDFiguresPage() {
  return (
    <AuthGate
      title="Explore the body"
      description="Sign in to spin through 3D anatomy and ask what a part does."
    >
      <Workspace />
    </AuthGate>
  );
}
