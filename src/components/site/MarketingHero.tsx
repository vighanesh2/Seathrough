"use client";

import { useState } from "react";
import { ArrowUp, Atom, Heart, MessageCircleQuestion } from "lucide-react";
import { useStudioAccess } from "@/components/site/StudioAccess";
import { stashPendingPrompt } from "@/lib/usage/pendingPrompt";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  {
    label: "Why do planets orbit the sun?",
    href: "/lessons?view=3d",
    icon: Atom,
  },
  {
    label: "What is a derivative function?",
    href: "/lessons",
    icon: MessageCircleQuestion,
  },
  {
    label: "How does the heart pump blood?",
    href: "/lessons",
    icon: Heart,
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
    <section className="relative bg-white px-5 pt-16 pb-16 md:px-6 md:pt-24 md:pb-20">
      <div className="mx-auto max-w-2xl text-center">
        <a
          href="https://www.producthunt.com/products/seethrough-2?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-seethrough-2"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 inline-flex flex-col items-center gap-2 transition opacity-90 hover:opacity-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="SeeThrough - Visibility is a possibility | Product Hunt"
            width={250}
            height={54}
            src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1208390&theme=light&t=1787293641189"
            className="h-[54px] w-[250px]"
          />
          <span className="text-[13px] font-medium tracking-[-0.01em] text-[#6a7d90]">
            Ranked{" "}
            <span className="text-[#1b6ca8]">#59</span> on Product Hunt
          </span>
        </a>
        <h1 className="text-[2.4rem] leading-[1.1] font-medium tracking-[-0.04em] text-[#1a2b3c] sm:text-5xl md:text-[3.25rem]">
          Ask anything.
          <br />
          <span className="text-[#1b6ca8]">Watch it get drawn.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[16px] leading-7 text-[#6a7d90]">
          Type a question. SeeThrough draws the steps while it explains on the
          board.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="mx-auto mt-10 w-full max-w-xl"
        aria-label="Ask a question"
      >
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(26,43,60,0.04),0_8px_24px_-12px_rgba(26,43,60,0.12)] transition-[border-color,box-shadow]",
            focused
              ? "border-[#0f4f7c] shadow-[0_1px_2px_rgba(26,43,60,0.04),0_12px_32px_-12px_rgba(27,108,168,0.28)]"
              : "border-[#1b6ca8]",
          )}
        >
          <label htmlFor="hero-ask" className="sr-only">
            What do you want to understand?
          </label>
          <input
            id="hero-ask"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="What do you want to understand?"
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[15px] text-[#1a2b3c] outline-none placeholder:text-[#8a9aab]"
            autoComplete="off"
          />
          <button
            type="submit"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors outline-none focus-visible:ring-3 focus-visible:ring-[#1b6ca8]/30",
              query.trim()
                ? "bg-[#1b6ca8] text-white hover:bg-[#0f4f7c]"
                : "bg-[#eef2f6] text-[#8a9aab]",
            )}
            aria-label="Explain"
          >
            <ArrowUp className="size-4" strokeWidth={2.25} />
          </button>
        </div>
      </form>

      <div className="mx-auto mt-4 flex max-w-xl flex-wrap items-center justify-center gap-2">
        {SUGGESTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setQuery(item.label);
                go(item.href, item.label);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e6ebf0] bg-white px-3 py-1.5 text-[13px] text-[#3d5166] transition-colors hover:border-[#c8d6e4] hover:bg-[#f2f4f7] hover:text-[#1a2b3c]"
            >
              <Icon className="size-3.5 text-[#1b6ca8]" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        className="mx-auto mt-2 flex max-w-xl items-end justify-center gap-1 pl-6 text-[#5c6b7a] sm:pl-10"
        aria-hidden
      >
        <svg
          width="42"
          height="40"
          viewBox="0 0 42 40"
          fill="none"
          className="mb-0.5 shrink-0"
        >
          <path
            d="M34.5 34.5c-6.2-1.4-16.8-5.8-22.2-16.2C9.5 12.6 9.2 7.2 10.8 3.2"
            stroke="currentColor"
            strokeWidth="1.55"
            strokeLinecap="round"
          />
          <path
            d="M6.2 8.8 11.2 2.4l5.8 5.2"
            stroke="currentColor"
            strokeWidth="1.55"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="-rotate-1 pb-0.5 font-display text-[1.15rem] leading-none font-medium italic tracking-[-0.01em] text-[#5c6b7a] sm:text-[1.25rem]">
          Try an example!
        </span>
      </div>

      <div className="mx-auto mt-14 max-w-3xl md:mt-16">
        <HeroVisual />
      </div>
    </section>
  );
}

const HERO_TABS = ["Explanation", "Diagram", "Practice"] as const;
type HeroTab = (typeof HERO_TABS)[number];

function HeroVisual() {
  const [tab, setTab] = useState<HeroTab>("Diagram");

  return (
    <div className="relative w-full">
      {/* Annotation */}
      <div
        className="pointer-events-none absolute -top-1 right-0 z-10 hidden items-start gap-1 text-[#1b6ca8] sm:flex md:right-2"
        aria-hidden
      >
        <svg
          width="36"
          height="34"
          viewBox="0 0 36 34"
          fill="none"
          className="mt-5 shrink-0"
        >
          <path
            d="M28 4C20 6 10 12 8 24"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M4.5 20.5 8.2 26.5 13.8 22"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="rotate-2 font-display text-[1.05rem] leading-tight font-medium italic tracking-[-0.01em]">
          From question
          <br />
          to clarity
        </span>
      </div>

      {/* Question pill */}
      <div className="relative z-10 mx-auto flex w-fit max-w-[calc(100%-1rem)] justify-center px-2">
        <div className="rounded-full bg-[#f7dce6] px-5 py-2.5 text-center text-[14px] font-medium tracking-[-0.01em] text-[#1a2b3c] shadow-[0_1px_2px_rgba(26,43,60,0.04)] sm:px-6 sm:text-[15px]">
          Why do planets orbit the sun?
        </div>
      </div>

      {/* Lesson card */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-[#e6ebf0] bg-white shadow-[0_18px_50px_-28px_rgba(26,43,60,0.28)]">
        <div
          className="flex items-center justify-center gap-10 border-b border-[#eef2f6] px-4 pt-5 sm:gap-14 sm:px-8 sm:pt-6"
          role="tablist"
          aria-label="Lesson views"
        >
          {HERO_TABS.map((item) => {
            const active = tab === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item)}
                className={cn(
                  "relative pb-3.5 text-[15px] tracking-[-0.01em] transition-colors outline-none focus-visible:text-[#1b6ca8] sm:text-[16px]",
                  active
                    ? "font-semibold text-[#1b6ca8]"
                    : "font-medium text-[#8a9aab] hover:text-[#3d5166]",
                )}
              >
                {item}
                {active ? (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#1b6ca8]" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          className="px-5 pt-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8"
          role="tabpanel"
        >
          {tab === "Explanation" ? <ExplanationPanel /> : null}
          {tab === "Diagram" ? <DiagramPanel /> : null}
          {tab === "Practice" ? <PracticePanel /> : null}
        </div>
      </div>
    </div>
  );
}

function ExplanationPanel() {
  return (
    <div className="mx-auto max-w-xl space-y-4 text-center">
      <h3 className="font-display text-[1.35rem] leading-snug font-medium tracking-[-0.02em] text-[#1a2b3c] sm:text-[1.5rem]">
        Gravity and motion balance
      </h3>
      <p className="text-[14px] leading-6 text-[#3d5166] sm:text-[15px] sm:leading-7">
        The Sun pulls every planet inward with gravity. At the same time, each
        planet is already moving sideways. Those two effects cancel into a
        steady curve, an orbit, instead of a crash or a straight escape.
      </p>
      <p className="text-[14px] leading-6 text-[#3d5166] sm:text-[15px] sm:leading-7">
        Think of it as a continuous fall around the Sun: always pulled in, always
        moving forward, never quite hitting.
      </p>
    </div>
  );
}

function DiagramPanel() {
  return (
    <>
      <OrbitDiagram />
      <p className="mx-auto mt-5 max-w-xl text-center text-[14px] leading-6 text-[#3d5166] sm:mt-6 sm:text-[15px] sm:leading-7">
        Planets stay in orbit because the Sun&apos;s gravity pulls them inward
        while their motion carries them forward, creating a balanced, continuous
        fall around the Sun.
      </p>
    </>
  );
}

function PracticePanel() {
  const [choice, setChoice] = useState<string | null>(null);
  const correct = "Gravity pulls in while sideways motion carries them forward";

  const options = [
    "The Sun pushes planets away with light",
    "Gravity pulls in while sideways motion carries them forward",
    "Planets are attached by invisible strings",
  ] as const;

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-center text-[14px] font-medium tracking-[-0.01em] text-[#1a2b3c] sm:text-[15px]">
        What keeps a planet in orbit?
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {options.map((option) => {
          const selected = choice === option;
          const isCorrect = option === correct;
          const showResult = choice !== null;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setChoice(option)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-[13.5px] leading-5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-[#1b6ca8]/30 sm:text-[14px]",
                !showResult &&
                  "border-[#e6ebf0] bg-white text-[#3d5166] hover:border-[#c8d6e4] hover:bg-[#f7f9fb]",
                showResult &&
                  isCorrect &&
                  "border-[#2a7a5c]/40 bg-[#eaf6f0] text-[#1a2b3c]",
                showResult &&
                  selected &&
                  !isCorrect &&
                  "border-[#c45c4a]/35 bg-[#fdf0ed] text-[#1a2b3c]",
                showResult &&
                  !selected &&
                  !isCorrect &&
                  "border-[#eef2f6] bg-[#fafbfc] text-[#8a9aab]",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {choice ? (
        <p
          className={cn(
            "mt-4 text-center text-[13px] leading-5",
            choice === correct ? "text-[#2a7a5c]" : "text-[#c45c4a]",
          )}
        >
          {choice === correct
            ? "Nice: gravity and forward motion work together."
            : "Not quite. Try again, or peek at the Diagram tab."}
        </p>
      ) : (
        <p className="mt-4 text-center text-[13px] text-[#8a9aab]">
          Pick the best answer.
        </p>
      )}
    </div>
  );
}

function OrbitDiagram() {
  return (
    <svg
      viewBox="0 0 420 180"
      className="mx-auto h-auto w-full max-w-md"
      aria-hidden
    >
      <ellipse
        cx="210"
        cy="92"
        rx="150"
        ry="58"
        fill="none"
        stroke="#1a2b3c"
        strokeWidth="1.4"
        strokeDasharray="5 6"
        opacity="0.55"
      />
      <circle cx="210" cy="92" r="28" fill="#f5c842" />
      <text
        x="210"
        y="97"
        textAnchor="middle"
        fontSize="13"
        fontFamily="var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif"
        fontWeight="600"
        fill="#1a2b3c"
      >
        Sun
      </text>
      <circle cx="348" cy="68" r="18" fill="#7eb6d9" />
      <text
        x="348"
        y="72"
        textAnchor="middle"
        fontSize="11"
        fontFamily="var(--font-inter), Inter, ui-sans-serif, system-ui, sans-serif"
        fontWeight="600"
        fill="#1a2b3c"
      >
        Planet
      </text>
    </svg>
  );
}
