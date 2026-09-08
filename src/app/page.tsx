import type { Metadata } from "next";
import { MarketingHome } from "@/components/site/MarketingHome";

export const metadata: Metadata = {
  title: "SeeThrough",
  description:
    "Type a question. Watch a board, a system map, or a 3D scene form as it is explained.",
};

export default function HomePage() {
  return <MarketingHome />;
}
