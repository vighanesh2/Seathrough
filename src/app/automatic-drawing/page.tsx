import type { Metadata } from "next";
import { Workspace } from "@/modules/automatic-drawing";
import { automaticDrawingMode } from "@/modules/automatic-drawing/mode";

export const metadata: Metadata = {
  title: automaticDrawingMode.metaTitle,
  description: automaticDrawingMode.metaDescription,
};

export default function AutomaticDrawingPage() {
  return (
    <Workspace />
  );
}
