import type { Metadata } from "next";
import { Workspace } from "@/modules/lessons";
import { lessonsMode } from "@/modules/lessons/mode";

export const metadata: Metadata = {
  title: lessonsMode.metaTitle,
  description: lessonsMode.metaDescription,
};

export default function LessonsPage() {
  return <Workspace />;
}
