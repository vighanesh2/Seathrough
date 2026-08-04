import type { Metadata } from "next";
import { DrawEngineShell } from "@/components/draw-engine/DrawEngineShell";

export const metadata: Metadata = {
  title: "Draw engine · SeeThrough",
  description:
    "Client Konva draw engine fed by a timed SSE command stream (AI as planner).",
};

export default function DrawEnginePage() {
  return <DrawEngineShell />;
}
