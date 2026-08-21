"use client";

import { useEffect } from "react";
import { MarketingBodySection } from "@/components/site/MarketingBodySection";
import { MarketingHero } from "@/components/site/MarketingHero";
import { MarketingMathSection } from "@/components/site/MarketingMathSection";
import { MarketingTestimonialsSection } from "@/components/site/MarketingTestimonialsSection";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { StudioAccessProvider } from "@/components/site/StudioAccess";

/**
 * Marketing shell — redesigning part by part.
 * Done: navbar, hero, body, math, testimonials, aurora.
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
            <MarketingBodySection />
            <MarketingMathSection />
            <MarketingTestimonialsSection />
          </main>
          <SiteFooter variant="marketing" />
        </div>
      </div>
    </StudioAccessProvider>
  );
}
