import type { Metadata } from "next";
import { DeveloperOffice } from "@/components/developer/DeveloperOffice";
import { developerMode } from "@/modules/developer/mode";

export const metadata: Metadata = {
  title: developerMode.metaTitle,
  description: developerMode.metaDescription,
};

export default function DeveloperPage() {
  return <DeveloperOffice />;
}
