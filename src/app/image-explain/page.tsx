import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { Workspace } from "@/modules/screenshot-explain";
import { screenshotExplainMode } from "@/modules/screenshot-explain/mode";

export const metadata: Metadata = {
  title: screenshotExplainMode.metaTitle,
  description: screenshotExplainMode.metaDescription,
};

export default function ImageExplainPage() {
  return (
    <AuthGate
      title="From a photo"
      description="Sign in to upload homework or notes and get a whiteboard explanation."
    >
      <Workspace />
    </AuthGate>
  );
}
