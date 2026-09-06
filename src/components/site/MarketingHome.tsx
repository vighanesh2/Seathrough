"use client";

import { useEffect } from "react";
import { MarketingHero } from "@/components/site/MarketingHero";
import { MarketingStory } from "@/components/site/MarketingStory";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { StudioAccessProvider } from "@/components/site/StudioAccess";

/** Marketing shell — classroom-board landing. Product chrome is separate. */
export function MarketingHome() {
  useEffect(() => {
    document.documentElement.classList.add("marketing-page");
    return () => {
      document.documentElement.classList.remove("marketing-page");
    };
  }, []);

  return (
    <StudioAccessProvider>
      <div className="marketing-shell relative flex min-h-dvh flex-col overflow-x-hidden text-ink">
        <div className="marketing-paper" aria-hidden />
        <div className="relative z-10 flex min-h-dvh flex-col">
          <SiteHeader variant="marketing" />
          <main className="flex flex-1 flex-col">
            <MarketingHero />
            <MarketingStory />
          </main>
          <SiteFooter variant="marketing" />
        </div>
      </div>
    </StudioAccessProvider>
  );
}
