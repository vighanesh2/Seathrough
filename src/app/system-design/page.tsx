import type { Metadata } from "next";
import { ExperimentBoard } from "@/components/experiment/ExperimentBoard";
import { systemDesignMode } from "@/modules/system-design/mode";

export const metadata: Metadata = {
  title: systemDesignMode.metaTitle,
  description: systemDesignMode.metaDescription,
};

export default function SystemDesignPage() {
  return <ExperimentBoard kind="system" />;
}
