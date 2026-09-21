import type { Metadata } from "next";
import { ExperimentBoard } from "@/components/experiment/ExperimentBoard";
import { smartTutorMode } from "@/modules/smart-tutor/mode";

export const metadata: Metadata = {
  title: smartTutorMode.metaTitle,
  description: smartTutorMode.metaDescription,
};

export default function SmartTutorPage() {
  return <ExperimentBoard />;
}
