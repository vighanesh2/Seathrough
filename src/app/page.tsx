import type { Metadata } from "next";
import { MarketingHome } from "@/components/site/MarketingHome";

export const metadata: Metadata = {
  title: "SeeThrough",
  description:
    "Ask a question. SeeThrough explains it with a visualization so you can watch and learn.",
};

export default function HomePage() {
  return <MarketingHome />;
}
