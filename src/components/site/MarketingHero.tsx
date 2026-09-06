"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useStudioAccess } from "@/components/site/StudioAccess";
import { stashPendingPrompt } from "@/lib/usage/pendingPrompt";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  {
    label: "Why do planets orbit?",
    href: "/scene-explain",
  },
  {
    label: "Show me what a derivative means",
    href: "/lessons",
  },
  {
    label: "How does the heart pump?",
    href: "/3d-figures",
  },
] as const;

export function MarketingHero() {
  const { openStudio } = useStudioAccess();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  function go(href: string, prompt?: string) {
    const text = (prompt ?? query).trim();
    if (text) {
      stashPendingPrompt(text, true);
    }
    openStudio(href);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) {
      openStudio("/lessons");
      return;
    }
    go("/lessons", text);
  }

  return (
    <section className="relative overflow-hidden px-5 pt-14 pb-20 md:px-8 md:pt-24 md:pb-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(30rem,1.08fr)] lg:gap-20">
        <div>
          <ProductHuntBadge />
          <p className="mb-5 text-[13px] font-semibold tracking-[-0.01em] text-[#496176]">
            A visual tutor for curious minds
          </p>
          <h1 className="max-w-[11ch] text-[3.45rem] leading-[0.95] font-semibold tracking-[-0.07em] text-[#17324a] sm:text-[4.7rem] lg:text-[5.2rem]">
            Start a lesson with{" "}
            <span className="relative whitespace-nowrap text-[#1b6ca8]">
              one question
              <svg
                viewBox="0 0 310 20"
                className="absolute -bottom-3 left-0 h-4 w-full overflow-visible"
                aria-hidden
              >
                <path
                  d="M4 12 C 72 3, 160 18, 306 6"
                  fill="none"
                  stroke="#c45e1a"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="animate-stroke-draw"
                />
              </svg>
            </span>
          </h1>
          <p className="mt-9 max-w-xl text-[1.05rem] leading-8 text-[#52697d] sm:text-[1.15rem]">
            Type anything you want to understand. SeeThrough starts a visual
            lesson and draws each step while it explains.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-9 max-w-xl"
            aria-label="Ask a question"
          >
            <div
              className={cn(
                "rounded-[1.4rem] border bg-white/95 p-2 shadow-[0_18px_60px_-34px_rgba(23,50,74,0.45)] transition-[border-color,box-shadow,transform] backdrop-blur-sm",
                focused
                  ? "-translate-y-0.5 border-[#1b6ca8]/55 shadow-[0_22px_70px_-32px_rgba(27,108,168,0.5)]"
                  : "border-[#cddbe6]",
              )}
            >
              <label htmlFor="hero-ask" className="sr-only">
                What do you want to learn?
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="hero-ask"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="What do you want to learn?"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[15px] text-[#17324a] outline-none placeholder:text-[#8092a2]"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[0.95rem] px-4 text-[13px] font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-[#1b6ca8]/30 sm:px-5",
                    query.trim()
                      ? "bg-[#1b6ca8] text-white hover:bg-[#0f4f7c]"
                      : "bg-[#17324a] text-white hover:bg-[#244760]",
                  )}
                >
                  <Sparkles className="size-3.5" />
                  Start lesson
                </button>
              </div>
            </div>
          </form>

          <div className="mt-5 max-w-xl rounded-[1.25rem] border border-[#cbdbe6] bg-white/55 p-3.5 backdrop-blur-sm">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="size-3.5 text-[#1b6ca8]" />
              <p className="text-[12px] font-semibold text-[#496176]">
                Not sure what to ask? Start with a lesson
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {SUGGESTIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setQuery(item.label);
                  go(item.href, item.label);
                }}
                className="group flex min-h-16 items-center justify-between gap-2 rounded-xl border border-[#d7e3eb] bg-white px-3 py-2.5 text-left text-[12.5px] leading-5 font-medium text-[#29465e] shadow-[0_5px_14px_-12px_rgba(23,50,74,0.5)] transition hover:-translate-y-0.5 hover:border-[#1b6ca8]/50 hover:text-[#1b6ca8]"
              >
                <span>{item.label}</span>
                <ArrowRight className="size-3.5 shrink-0 text-[#1b6ca8] transition group-hover:translate-x-0.5" />
              </button>
            ))}
            </div>
          </div>
        </div>

        <LessonPreview
          onOpen={() =>
            go("/lessons", query.trim() || "Show me what a derivative means")
          }
        />
      </div>
    </section>
  );
}

const PREVIEW_QUESTION = "Show me what a derivative means";

const PREVIEW_NARRATION = [
  "Here is a curve. Pick one point on it.",
  "Draw the line that just touches the curve there. That is the tangent.",
  "The derivative is how steep that line is at this exact point.",
];

/**
 * Miniature of the real lesson screen: header, prompt bar, ruled board on
 * the left, "Teacher explains" rail on the right. Mirrors LessonShell.
 */
function LessonPreview({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="relative mx-auto w-full max-w-152">
      <div
        className="absolute -inset-10 rounded-full bg-[#9cc7e5]/30 blur-3xl"
        aria-hidden
      />
      <button
        type="button"
        onClick={onOpen}
        className="group relative w-full overflow-hidden rounded-[1.4rem] border border-[#c8d6e4] bg-white text-left shadow-[0_28px_80px_-38px_rgba(23,50,74,0.45)] outline-none transition duration-500 hover:-translate-y-1 focus-visible:ring-3 focus-visible:ring-[#1b6ca8]/30"
        aria-label={`Open this lesson: ${PREVIEW_QUESTION}`}
      >
        {/* App header */}
        <div className="flex items-center gap-2.5 border-b border-[#e6ebf0] px-3.5 py-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- brand asset */}
          <img
            src="/SeeThrough_logo.png"
            alt=""
            className="size-6 shrink-0 object-contain"
          />
          <span className="h-4 w-px bg-[#e6ebf0]" aria-hidden />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold tracking-[0.16em] text-[#1b6ca8] uppercase">
              Topic explanation
            </p>
            <p className="truncate text-[12px] font-medium text-[#1a2b3c]">
              The derivative as a slope
            </p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-[#e6ebf0] px-2 py-1 text-[10px] font-medium text-[#3d5166]">
            <span className="size-1.5 rounded-full bg-[#2a7a5c]" />
            Playing
          </span>
        </div>

        {/* Prompt bar */}
        <div className="border-b border-[#e6ebf0] px-3.5 py-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-[#d7e3eb] bg-[#f7fafc] px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[12px] text-[#1a2b3c]">
              {PREVIEW_QUESTION}
            </span>
            <span className="shrink-0 rounded-lg bg-[#1b6ca8] px-2.5 py-1 text-[10px] font-semibold text-white">
              Start
            </span>
          </div>
        </div>

        {/* Board + narration rail */}
        <div className="grid grid-cols-[1.35fr_1fr]">
          <div className="relative min-h-62 border-r border-[#e6ebf0] bg-[#fbfcfe]">
            <p className="border-b border-[#e6ebf0]/70 bg-[#d4e8f6]/40 px-3 py-1.5 text-[10.5px] text-[#1a2b3c]">
              <span className="font-semibold text-[#0f4f7c]">Tutor: </span>
              Watch the tangent line turn as the point moves.
            </p>
            <BoardSketch />
          </div>

          <aside className="flex min-h-0 flex-col bg-white">
            <div className="border-b border-[#e6ebf0] px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[9px] font-semibold tracking-[0.16em] text-[#0f4f7c] uppercase">
                Teacher explains
                <span className="size-1.5 animate-soft-pulse rounded-full bg-[#2a7a5c]" />
              </p>
            </div>
            <div className="space-y-2.5 px-3 py-3">
              {PREVIEW_NARRATION.map((line, i) => (
                <p
                  key={line}
                  className={cn(
                    "text-[11.5px] leading-normal text-[#1e3a5f]",
                    i === PREVIEW_NARRATION.length - 1 &&
                      "border-l-[3px] border-[#2a7a5c] bg-[#d5efe4]/60 py-1 pl-2 text-[#1a2b3c]",
                  )}
                >
                  {line}
                </p>
              ))}
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-between border-t border-[#e6ebf0] bg-[#f7fafc] px-3.5 py-2">
          <span className="text-[11px] text-[#6a7d90]">
            This is what a lesson looks like
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1b6ca8]">
            Open this lesson
            <ArrowRight className="size-3 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>
    </div>
  );
}

/** Ruled board with a curve, a moving point and its tangent line. */
function BoardSketch() {
  return (
    <svg
      viewBox="0 0 360 210"
      className="h-[calc(100%-1.9rem)] w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {Array.from({ length: 9 }, (_, i) => (
        <line
          key={`h-${i}`}
          x1="0"
          x2="360"
          y1={i * 28 - 1}
          y2={i * 28 - 1}
          stroke="rgba(27,108,168,0.08)"
        />
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <line
          key={`v-${i}`}
          y1="0"
          y2="210"
          x1={i * 28 - 1}
          x2={i * 28 - 1}
          stroke="rgba(27,108,168,0.08)"
        />
      ))}
      {/* axes */}
      <line x1="28" y1="182" x2="340" y2="182" stroke="#8a9aab" strokeWidth="1" />
      <line x1="40" y1="20" x2="40" y2="196" stroke="#8a9aab" strokeWidth="1" />
      {/* curve */}
      <path
        d="M44 166 C 92 166 112 150 138 118 C 168 80 190 42 236 40 C 282 39 300 120 336 132"
        fill="none"
        stroke="#1b6ca8"
        strokeWidth="2.6"
        strokeLinecap="round"
        className="animate-stroke-draw"
      />
      {/* tangent */}
      <line
        x1="118"
        y1="168"
        x2="222"
        y2="66"
        stroke="#c45e1a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="170" cy="117" r="4.5" fill="#c45e1a" />
      <text
        x="232"
        y="104"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="10"
        fontWeight="600"
        fill="#8d3f0f"
      >
        slope = f&apos;(x)
      </text>
      <text
        x="52"
        y="34"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="10"
        fill="#3d5166"
      >
        f(x)
      </text>
    </svg>
  );
}

function ProductHuntBadge() {
  return (
    <a
      href="https://www.producthunt.com/products/seethrough-2/launches/seethrough-2?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-seethrough-2"
      target="_blank"
      rel="noopener noreferrer"
      className="mb-7 inline-block transition hover:-translate-y-0.5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Product Hunt badge */}
      <img
        alt="SeeThrough - Visibility is a possibility | Product Hunt"
        width="250"
        height="54"
        src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1208390&theme=light&t=1788673127014"
      />
    </a>
  );
}
