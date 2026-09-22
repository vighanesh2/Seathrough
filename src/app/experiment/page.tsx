import type { Metadata } from "next";
import { ExperimentBoard } from "@/components/experiment/ExperimentBoard";

export const metadata: Metadata = {
  title: "Experiment | SeeThrough",
  description: "Full-page whiteboard for experiments.",
};

export default function ExperimentPage() {
  return <ExperimentBoard />;
}
