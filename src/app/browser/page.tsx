import type { Metadata } from "next";
import { BrowserExperienceWorkspace } from "@/components/browser-experience/BrowserExperienceWorkspace";
import { browserExperienceMode } from "@/modules/browser-experience/mode";

export const metadata: Metadata = {
  title: browserExperienceMode.metaTitle,
  description: browserExperienceMode.metaDescription,
};

export default function BrowserExperiencePage() {
  return <BrowserExperienceWorkspace />;
}
