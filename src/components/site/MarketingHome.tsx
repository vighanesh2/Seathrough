"use client";

import { useEffect } from "react";
import { MarketingClaritySection } from "@/components/site/MarketingClaritySection";
import { MarketingCtaSection } from "@/components/site/MarketingCtaSection";
import { MarketingFeaturesSection } from "@/components/site/MarketingFeaturesSection";
import { MarketingHero } from "@/components/site/MarketingHero";
import { MarketingSubjectsSection } from "@/components/site/MarketingSubjectsSection";
import { MarketingTestimonialsSection } from "@/components/site/MarketingTestimonialsSection";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { StudioAccessProvider } from "@/components/site/StudioAccess";

/**
 * Marketing shell — redesigning part by part.
 */
export function MarketingHome() {
  useEffect(() => {
    document.documentElement.classList.add("marketing-page");
    return () => {
      document.documentElement.classList.remove("marketing-page");
    };
  }, []);

  return (
    <StudioAccessProvider>
      <div className="marketing-shell flex min-h-dvh flex-col text-[#1a2b3c]">
        <div className="marketing-aurora" aria-hidden>
          <div className="marketing-aurora__wash" />
          <div className="marketing-aurora__blob marketing-aurora__blob--a" />
          <div className="marketing-aurora__blob marketing-aurora__blob--b" />
          <div className="marketing-aurora__blob marketing-aurora__blob--c" />
        </div>
        <div className="relative z-10 flex min-h-dvh flex-col">
          <SiteHeader variant="marketing" />
          <main className="flex flex-1 flex-col">
            <MarketingHero />
            <MarketingFeaturesSection />
            <MarketingClaritySection />
            <MarketingSubjectsSection />
            <MarketingTestimonialsSection />
            <MarketingCtaSection />
          </main>
          <SiteFooter variant="marketing" />
        </div>
      </div>
    </StudioAccessProvider>
  );
}
