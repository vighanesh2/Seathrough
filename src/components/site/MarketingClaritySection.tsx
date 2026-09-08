"use client";

import { ArrowRight, Check } from "lucide-react";
import { useStudioAccess } from "@/components/site/StudioAccess";

const PERKS = [
  "No credit card required",
  "Free plan with core features",
  "Used by students, educators, and lifelong learners",
] as const;

/** Two-column clarity pitch with product mockup. */
export function MarketingClaritySection() {
  const { openAuth } = useStudioAccess();

  return (
    <section className="bg-white px-5 py-16 md:px-6 md:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-xl">
          <p className="text-[12px] font-semibold tracking-[0.12em] text-[#1b6ca8] uppercase">
            A clearer way to learn
          </p>
          <h2 className="mt-3 font-display text-[2.15rem] leading-[1.12] font-medium tracking-[-0.03em] text-[#1a2b3c] sm:text-[2.6rem] md:text-[2.85rem]">
            Go beyond text.
            <br />
            See the big picture.
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-[#6a7d90] sm:text-[16px] sm:leading-8">
            SeeThrough combines AI with beautiful visuals to help you truly
            understand. It&apos;s like having a personal tutor, visualizer, and
            study partner all in one.
          </p>

          <button
            type="button"
            onClick={() => openAuth("signup")}
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-[#1a2b3c] px-6 text-[15px] font-medium text-white transition hover:bg-[#24384c]"
          >
            Get Started Free
            <ArrowRight className="size-4" strokeWidth={2.25} />
          </button>

          <ul className="mt-7 space-y-3">
            {PERKS.map((perk) => (
              <li
                key={perk}
                className="flex items-center gap-3 text-[14px] text-[#3d5166] sm:text-[15px]"
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#dcebf7] text-[#1b6ca8]">
                  <Check className="size-3" strokeWidth={2.75} />
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute -top-2 -right-1 z-10 hidden items-start gap-1 text-[#1b6ca8] sm:flex md:-right-2"
            aria-hidden
          >
            <svg
              width="34"
              height="32"
              viewBox="0 0 34 32"
              fill="none"
              className="mt-4 shrink-0"
            >
              <path
                d="M26 3C18 6 10 12 8 22"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M4.5 18.5 8 24.5 13.5 20"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="rotate-2 font-display text-[1.05rem] leading-tight font-medium italic tracking-[-0.01em]">
              Interactive
              <br />
              diagrams
            </span>
          </div>

          <div className="rounded-[1.75rem] bg-[#dcebf7] p-4 sm:p-6 md:p-8">
            <div className="overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_22px_50px_-28px_rgba(26,43,60,0.35)]">
              <div className="flex items-center gap-1.5 border-b border-[#eef2f6] px-4 py-3">
                <span className="size-2.5 rounded-full bg-[#7ec8a3]" />
                <span className="size-2.5 rounded-full bg-[#f0c96a]" />
                <span className="size-2.5 rounded-full bg-[#7eb6d9]" />
              </div>

              <div className="px-4 pt-4 sm:px-5">
                <div className="rounded-full bg-[#eef4f9] px-4 py-2.5 text-[13px] font-medium text-[#1a2b3c] sm:text-[14px]">
                  How does a battery work?
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-8 border-b border-[#eef2f6] px-4">
                {(["Explanation", "Diagram", "Practice"] as const).map((tab) => {
                  const active = tab === "Diagram";
                  return (
                    <span
                      key={tab}
                      className={
                        active
                          ? "relative pb-2.5 text-[13px] font-semibold text-[#1b6ca8]"
                          : "pb-2.5 text-[13px] font-medium text-[#8a9aab]"
                      }
                    >
                      {tab}
                      {active ? (
                        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#1b6ca8]" />
                      ) : null}
                    </span>
                  );
                })}
              </div>

              <div className="px-5 py-6 sm:px-6 sm:py-7">
                <p className="text-center text-[14px] font-semibold tracking-[-0.01em] text-[#1a2b3c]">
                  Inside a Battery
                </p>
                <BatteryDiagram />
                <p className="mx-auto mt-4 max-w-sm text-center text-[13px] leading-5 text-[#6a7d90] sm:text-[13.5px] sm:leading-6">
                  A battery converts chemical energy into electrical energy
                  through a reaction that moves electrons from the anode to the
                  cathode.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BatteryDiagram() {
  return (
    <svg
      viewBox="0 0 360 170"
      className="mx-auto mt-4 h-auto w-full max-w-sm"
      aria-hidden
    >
      <path
        d="M78 78 V42 H164"
        fill="none"
        stroke="#8a9aab"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M196 42 H282 V78"
        fill="none"
        stroke="#8a9aab"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Bulb */}
      <circle cx="180" cy="42" r="15" fill="#fff7d6" stroke="#e2b93d" strokeWidth="2" />
      <path
        d="M174 48 h12 v4 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 z"
        fill="#e2b93d"
        opacity="0.55"
      />
      <path
        d="M175 38 q5 -6 10 0"
        fill="none"
        stroke="#c49a1a"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <text
        x="180"
        y="18"
        textAnchor="middle"
        fontSize="10"
        fill="#6a7d90"
        fontFamily="var(--font-inter), Inter, sans-serif"
      >
        Electron flow
      </text>
      <path
        d="M118 28 H152"
        fill="none"
        stroke="#6a7d90"
        strokeWidth="1.4"
        strokeLinecap="round"
        markerEnd="url(#batt-arrow)"
      />

      <rect x="48" y="78" width="60" height="58" rx="8" fill="#d7dee6" />
      <text
        x="78"
        y="106"
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill="#1a2b3c"
        fontFamily="var(--font-inter), Inter, sans-serif"
      >
        Anode
      </text>
      <text
        x="78"
        y="120"
        textAnchor="middle"
        fontSize="9"
        fill="#5a6b7a"
        fontFamily="var(--font-inter), Inter, sans-serif"
      >
        (negative)
      </text>

      <rect x="252" y="78" width="60" height="58" rx="8" fill="#f3b07a" />
      <text
        x="282"
        y="106"
        textAnchor="middle"
        fontSize="11"
        fontWeight="600"
        fill="#1a2b3c"
        fontFamily="var(--font-inter), Inter, sans-serif"
      >
        Cathode
      </text>
      <text
        x="282"
        y="120"
        textAnchor="middle"
        fontSize="9"
        fill="#5a6b7a"
        fontFamily="var(--font-inter), Inter, sans-serif"
      >
        (positive)
      </text>

      <path
        d="M118 108 H242"
        fill="none"
        stroke="#8a9aab"
        strokeWidth="1.6"
        strokeDasharray="4 4"
        strokeLinecap="round"
        markerEnd="url(#batt-arrow)"
      />
      <text
        x="180"
        y="102"
        textAnchor="middle"
        fontSize="10"
        fill="#6a7d90"
        fontFamily="var(--font-inter), Inter, sans-serif"
      >
        Ion flow
      </text>

      <defs>
        <marker
          id="batt-arrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6 Z" fill="#6a7d90" />
        </marker>
      </defs>
    </svg>
  );
}
