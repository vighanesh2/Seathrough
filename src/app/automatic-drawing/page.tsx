import type { Metadata } from "next";
import { WhiteboardShell } from "@/components/whiteboard/WhiteboardShell";

export const metadata: Metadata = {
  title: "Whiteboard · SeeThrough",
  description: "Prompt SeeThrough’s whiteboard and watch it draw automatically.",
};

export default function AutomaticDrawingPage() {
  return <WhiteboardShell />;
}
