import type { Metadata } from "next";
import { Workspace } from "@/modules/ai-tutor";
import { aiTutorMode } from "@/modules/ai-tutor/mode";

export const metadata: Metadata = {
  title: aiTutorMode.metaTitle,
  description: aiTutorMode.metaDescription,
};

export default function AiTutorPage() {
  return <Workspace />;
}
