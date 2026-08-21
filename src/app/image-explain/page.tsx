import type { Metadata } from "next";
import { Workspace } from "@/modules/screenshot-explain";
import { screenshotExplainMode } from "@/modules/screenshot-explain/mode";

export const metadata: Metadata = {
  title: screenshotExplainMode.metaTitle,
  description: screenshotExplainMode.metaDescription,
};

export default function ImageExplainPage() {
  return (
    <Workspace />
  );
}
