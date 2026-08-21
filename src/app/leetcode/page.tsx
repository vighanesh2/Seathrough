import type { Metadata } from "next";
import { AuthGate } from "@/components/auth/AuthGate";
import { Workspace } from "@/modules/leetcode";
import { leetcodeMode } from "@/modules/leetcode/mode";

export const metadata: Metadata = {
  title: leetcodeMode.metaTitle,
  description: leetcodeMode.metaDescription,
};

export default function LeetcodePage() {
  return (
    <AuthGate
      title="Coding practice"
      description="Sign in to paste a problem and step through the algorithm on the board."
    >
      <Workspace />
    </AuthGate>
  );
}
