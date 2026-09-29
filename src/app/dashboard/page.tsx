import type { Metadata } from "next";
import { SavedVideosDashboard, type DashboardTab } from "@/components/dashboard/SavedVideosDashboard";
import { dashboardMode } from "@/modules/dashboard/mode";

export const metadata: Metadata = {
  title: dashboardMode.metaTitle,
  description: dashboardMode.metaDescription,
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  const initialTab: DashboardTab = tab === "explain" ? "explain" : "lessons";
  return <SavedVideosDashboard initialTab={initialTab} />;
}
