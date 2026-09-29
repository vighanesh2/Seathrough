import type { Metadata } from "next";
import { ExplainVideo } from "@/components/explain-video/ExplainVideo";
import { explainVideoMode } from "@/modules/explain-video/mode";

export const metadata: Metadata = {
  title: explainVideoMode.metaTitle,
  description: explainVideoMode.metaDescription,
};

export default function VideoPage() {
  return <ExplainVideo />;
}
