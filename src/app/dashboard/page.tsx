import type { Metadata } from "next";
import { SavedVideosDashboard } from "@/components/dashboard/SavedVideosDashboard";
import { dashboardMode } from "@/modules/dashboard/mode";

export const metadata: Metadata = {
  title: dashboardMode.metaTitle,
  description: dashboardMode.metaDescription,
};

export default function DashboardPage() {
  return <SavedVideosDashboard />;
}
