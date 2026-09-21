import type { Metadata } from "next";
import { TutorMockup } from "@/components/ai-tutor/TutorMockup";

export const metadata: Metadata = {
  title: "AI Tutor Mockup",
  description: "Visual mockup of the AI tutor landing screen.",
};

export default function AiTutorMockupPage() {
  return <TutorMockup />;
}
