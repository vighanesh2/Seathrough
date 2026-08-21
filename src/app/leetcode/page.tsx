import type { Metadata } from "next";
import { Workspace } from "@/modules/leetcode";
import { leetcodeMode } from "@/modules/leetcode/mode";

export const metadata: Metadata = {
  title: leetcodeMode.metaTitle,
  description: leetcodeMode.metaDescription,
};

export default function LeetcodePage() {
  return (
    <Workspace />
  );
}
