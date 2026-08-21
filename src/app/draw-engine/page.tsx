import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { Workspace } from "@/modules/draw-engine";
import { drawEngineMode } from "@/modules/draw-engine/mode";

export const metadata: Metadata = {
  title: drawEngineMode.metaTitle,
  description: drawEngineMode.metaDescription,
};

export default function DrawEnginePage() {
  return (
    <AuthGate
      title="Draw engine"
      description="Sign in to run timed board-engine experiments."
    >
      <Workspace />
    </AuthGate>
  );
}
