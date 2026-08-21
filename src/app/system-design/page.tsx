import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { Workspace } from "@/modules/system-design";
import { systemDesignMode } from "@/modules/system-design/mode";

export const metadata: Metadata = {
  title: systemDesignMode.metaTitle,
  description: systemDesignMode.metaDescription,
};

export default function SystemDesignPage() {
  return (
    <AuthGate
      title="System design"
      description="Sign in to draw architectures — services, caches, and stores assembling on the board."
    >
      <Workspace />
    </AuthGate>
  );
}
