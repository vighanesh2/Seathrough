import type { Metadata } from "next";
import { ModeHome } from "@/components/modes/ModeHome";

export const metadata: Metadata = {
  title: "SeeThrough",
  description:
    "Stuck on homework? Ask a question or upload a photo — we’ll draw it out on a whiteboard.",
};

export default function HomePage() {
  return <ModeHome />;
}
