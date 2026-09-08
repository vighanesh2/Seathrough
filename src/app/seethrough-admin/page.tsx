import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const metadata: Metadata = {
  title: "SeeThrough Admin",
  description: "Browse learner chats and board snapshots.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SeethroughAdminPage() {
  return <AdminConsole />;
}
