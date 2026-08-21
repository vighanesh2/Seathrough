import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { Workspace } from "@/modules/automatic-drawing";
import { automaticDrawingMode } from "@/modules/automatic-drawing/mode";

export const metadata: Metadata = {
  title: automaticDrawingMode.metaTitle,
  description: automaticDrawingMode.metaDescription,
};

export default function AutomaticDrawingPage() {
  return (
    <AuthGate
      title="Automatic drawing"
      description="Sign in to prompt the whiteboard and watch a drawing plan execute."
    >
      <Workspace />
    </AuthGate>
  );
}
