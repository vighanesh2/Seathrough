import type { Metadata } from "next";
import { Workspace } from "@/modules/system-design";
import { systemDesignMode } from "@/modules/system-design/mode";

export const metadata: Metadata = {
  title: systemDesignMode.metaTitle,
  description: systemDesignMode.metaDescription,
};

export default function SystemDesignPage() {
  return (
    <Workspace />
  );
}
