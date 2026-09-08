"use client";

import { ArrowRight } from "lucide-react";
import { useStudioAccess } from "@/components/site/StudioAccess";

/** Dark CTA banner before the footer. */
export function MarketingCtaSection() {
  const { openAuth } = useStudioAccess();

  return (
    <section className="bg-white px-5 py-10 md:px-6 md:py-14">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-[#1b6ca8] px-6 py-10 text-white shadow-[0_24px_60px_-32px_rgba(27,108,168,0.55)] sm:px-10 sm:py-12 md:px-12 md:py-14">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] opacity-40"
          aria-hidden
        >
          <svg
            viewBox="0 0 1200 220"
            className="h-full w-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0 140 C 180 90, 320 180, 500 130 C 680 80, 820 170, 1000 120 C 1100 95, 1160 130, 1200 110 L 1200 220 L 0 220 Z"
              fill="rgba(255,255,255,0.14)"
            />
            <path
              d="M0 170 C 220 130, 360 200, 540 155 C 720 110, 880 190, 1060 150 C 1140 135, 1180 160, 1200 150 L 1200 220 L 0 220 Z"
              fill="rgba(255,255,255,0.1)"
            />
          </svg>
        </div>

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="max-w-xl">
            <p className="text-[12px] font-semibold tracking-[0.12em] text-white/75 uppercase">
              Ready to see through to understanding?
            </p>
            <h2 className="mt-3 font-display text-[2rem] leading-[1.12] font-medium tracking-[-0.03em] sm:text-[2.4rem] md:text-[2.65rem]">
              Start learning visually today.
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-white/85 sm:text-[16px]">
              Join thousands of learners who are understanding more, faster.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2.5 lg:items-end">
            <button
              type="button"
              onClick={() => openAuth("signup")}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-[#1b6ca8] transition hover:bg-[#f2f8fc]"
            >
              Get Started Free
              <ArrowRight className="size-4" strokeWidth={2.25} />
            </button>
            <p className="text-[12.5px] text-white/70">No credit card required</p>
          </div>
        </div>
      </div>
    </section>
  );
}
