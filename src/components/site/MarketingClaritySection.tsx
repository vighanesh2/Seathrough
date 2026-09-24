"use client";

import { useStudioAccess } from "@/components/site/StudioAccess";

const STEPS = [
  {
    mark: "01",
    title: "Draws",
    body: "Ask in plain language. The figure appears on the board, one mark at a time.",
  },
  {
    mark: "02",
    title: "Talks",
    body: "A voice walks the same marks, so you hear the reason while you see it.",
  },
  {
    mark: "03",
    title: "Checks",
    body: "It pauses and asks whether the step landed, then keeps the lesson if you want it.",
  },
] as const;

export function MarketingClaritySection() {
  const { openStudio } = useStudioAccess();

  return (
    <section className="px-5 pt-6 pb-16 md:px-8 md:pt-8 md:pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-[#d5e0ea] bg-[#d5e0ea] sm:grid-cols-3">
          {STEPS.map((step) => (
            <article key={step.mark} className="bg-white/90 px-5 py-6 sm:px-6 sm:py-7">
              <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] tracking-[0.16em] text-[#1b6ca8]">
                {step.mark}
              </p>
              <h2 className="mt-3 text-[1.45rem] leading-none font-medium tracking-[-0.03em] text-[#142433]">
                {step.title}
              </h2>
              <p className="mt-3 text-[14px] leading-6 text-[#3d5166]">{step.body}</p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-[14px] text-[#6a7d90]">
          No credit card.{" "}
          <button
            type="button"
            onClick={() => openStudio("/smart-tutor")}
            className="font-medium text-[#1b6ca8] underline-offset-4 outline-none hover:underline focus-visible:underline"
          >
            Start with a question
          </button>
        </p>
      </div>
    </section>
  );
}
