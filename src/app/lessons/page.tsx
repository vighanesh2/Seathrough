import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { Workspace } from "@/modules/lessons";
import { lessonsMode } from "@/modules/lessons/mode";

export const metadata: Metadata = {
  title: lessonsMode.metaTitle,
  description: lessonsMode.metaDescription,
};

export default function LessonsPage() {
  return (
    <AuthGate
      title="Topic explanation"
      description="Sign in to open the whiteboard. Ask a question and watch it drawn step by step."
    >
      <Workspace />
    </AuthGate>
  );
}
