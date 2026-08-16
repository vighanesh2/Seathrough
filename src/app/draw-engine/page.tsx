import type { Metadata } from "next";
import { Workspace } from "@/modules/draw-engine";
import { drawEngineMode } from "@/modules/draw-engine/mode";

export const metadata: Metadata = {
  title: drawEngineMode.metaTitle,
  description: drawEngineMode.metaDescription,
};

export default function DrawEnginePage() {
  return <Workspace />;
}
