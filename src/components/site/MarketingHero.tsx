"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
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
    <section className="relative overflow-hidden px-5 pt-12 pb-16 md:px-8 md:pt-20 md:pb-24">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(28rem,1.05fr)] lg:gap-16">
        <div className="min-w-0">
          <div className="mb-7">
            <ProductHuntBadge />
            <p className="mt-2.5 text-[13px] font-medium text-ink-soft">
              Ranked #53 Product of the Day
            </p>
          </div>

          <p className="font-display text-[1.35rem] font-semibold tracking-[-0.03em] text-ink sm:text-[1.5rem]">
            SeeThrough
          </p>

          <h1 className="font-display mt-3 max-w-[18ch] text-[2.55rem] leading-[1.05] font-semibold tracking-[-0.035em] text-ink sm:text-[3.25rem] lg:text-[3.7rem]">
            The AI tutor that{" "}
            <span className="relative whitespace-nowrap text-accent">
              draws while it teaches
              <svg
                viewBox="0 0 410 20"
                className="absolute -bottom-2 left-0 h-3.5 w-full overflow-visible sm:-bottom-3 sm:h-4"
                aria-hidden
              >
                <path
                  d="M4 12 C 96 3, 210 18, 406 6"
                  fill="none"
                  stroke="var(--copper)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  pathLength={280}
                  className="animate-stroke-draw"
                />
              </svg>
            </span>
            .
          </h1>

          <p className="mt-7 max-w-md text-[1.05rem] leading-8 text-ink-soft sm:text-[1.1rem]">
            Ask any question in math, science, or anatomy. SeeThrough opens a
            lesson on a digital board and sketches each step as it explains —
            graphs, diagrams, and 3D models included.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-8 max-w-xl"
            aria-label="Ask a question"
          >
            <div
              className={cn(
                "rounded-[1.4rem] border bg-chalk/95 p-2 shadow-[0_18px_60px_-34px_rgba(26,43,60,0.4)] transition-[border-color,box-shadow,transform]",
                focused
                  ? "-translate-y-0.5 border-accent/50 shadow-[0_22px_70px_-32px_rgba(27,108,168,0.45)]"
                  : "border-board-edge",
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
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[15px] text-ink outline-none placeholder:text-muted"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[0.95rem] px-4 text-[13px] font-semibold text-white transition-colors outline-none focus-visible:ring-3 focus-visible:ring-accent/30 sm:px-5",
                    query.trim()
                      ? "bg-accent hover:bg-accent-deep"
                      : "bg-ink hover:bg-marker",
                  )}
                >
                  Start lesson
                </button>
              </div>
            </div>
          </form>

          <ul className="mt-5 flex max-w-xl flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
            <li className="text-[12px] font-medium text-muted">Try asking</li>
            {SUGGESTIONS.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(item.label);
                    go(item.href, item.label);
                  }}
                  className="group inline-flex items-center gap-1 text-left text-[12.5px] font-medium text-ink-soft transition hover:text-accent"
                >
                  <span className="border-b border-board-edge group-hover:border-accent/50">
                    {item.label}
                  </span>
                  <ArrowRight className="size-3 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <LessonPreview />
      </div>
    </section>
  );
}

/** Board-only preview — decorative, not a link. */
function LessonPreview() {
  return (
    <div className="relative mx-auto w-full max-w-152">
      <div
        className="absolute -inset-8 rounded-full bg-accent/10 blur-3xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-[1.4rem] border border-board-edge bg-board shadow-[0_28px_80px_-38px_rgba(26,43,60,0.4)]">
        <p className="px-5 pt-5 text-[13px] font-semibold tracking-tight text-ink sm:px-6 sm:pt-6 sm:text-[14px]">
          Gravity keeps the moon falling around Earth
        </p>
        <div className="aspect-[3/2] w-full" aria-hidden>
          <OrbitSketch />
        </div>
      </div>
    </div>
  );
}

/** Lesson board: Earth, a moving moon, and the path it would take alone. */
function OrbitSketch() {
  const cx = 168;
  const cy = 118;
  const orbitR = 78;

  return (
    <svg
      viewBox="0 0 360 236"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <radialGradient id="preview-earth" cx="38%" cy="34%" r="68%">
          <stop offset="0%" stopColor="#6eb4e0" />
          <stop offset="42%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-deep)" />
        </radialGradient>
        <radialGradient id="preview-land" cx="40%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#5aa87a" />
          <stop offset="100%" stopColor="var(--success)" />
        </radialGradient>
        <radialGradient id="preview-moon" cx="32%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f4f1ea" />
          <stop offset="100%" stopColor="#9aa6b4" />
        </radialGradient>
        <radialGradient id="preview-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="color-mix(in srgb, var(--accent) 22%, transparent)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r="118" fill="url(#preview-glow)" />

      <circle
        cx={cx}
        cy={cy}
        r={orbitR}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.4"
        strokeDasharray="5 6"
        opacity="0.55"
        className="animate-orbit-dash"
      />

      <circle
        cx={cx}
        cy={cy}
        r="36"
        fill="url(#preview-earth)"
        stroke="var(--accent-deep)"
        strokeWidth="1"
      />
      <path
        d={`M${cx - 18} ${cy - 8} C ${cx - 8} ${cy - 22}, ${cx + 6} ${cy - 18}, ${cx + 4} ${cy - 4} C ${cx + 14} ${cy + 2}, ${cx + 2} ${cy + 16}, ${cx - 10} ${cy + 10} C ${cx - 22} ${cy + 4}, ${cx - 24} ${cy + 2}, ${cx - 18} ${cy - 8}Z`}
        fill="url(#preview-land)"
        opacity="0.92"
      />
      <path
        d={`M${cx + 10} ${cy + 8} C ${cx + 20} ${cy + 4}, ${cx + 26} ${cy + 14}, ${cx + 16} ${cy + 20} C ${cx + 8} ${cy + 22}, ${cx + 4} ${cy + 14}, ${cx + 10} ${cy + 8}Z`}
        fill="url(#preview-land)"
        opacity="0.8"
      />
      <circle
        cx={cx}
        cy={cy}
        r="40"
        fill="none"
        stroke="rgba(180,220,245,0.45)"
        strokeWidth="3"
      />
      <text
        x={cx}
        y={cy + 52}
        textAnchor="middle"
        fontFamily="var(--font-geist), ui-sans-serif, system-ui, sans-serif"
        fontSize="10"
        fontWeight="600"
        fill="var(--accent-deep)"
      >
        Earth
      </text>

      <g
        className="animate-orbit"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle
          cx={cx + orbitR}
          cy={cy}
          r="8"
          fill="url(#preview-moon)"
          stroke="#8a9aab"
          strokeWidth="0.8"
        />
        <circle cx={cx + orbitR - 2} cy={cy - 2} r="1.4" fill="#c5ccd4" />
        <text
          x={cx + orbitR}
          y={cy + 20}
          textAnchor="middle"
          fontFamily="var(--font-geist), ui-sans-serif, system-ui, sans-serif"
          fontSize="9"
          fontWeight="600"
          fill="var(--ink-soft)"
        >
          Moon
        </text>
        <line
          x1={cx + orbitR - 12}
          y1={cy}
          x2={cx + 42}
          y2={cy}
          stroke="var(--copper)"
          strokeWidth="1.6"
          className="animate-gravity-fade"
        />
      </g>
    </svg>
  );
}

function ProductHuntBadge() {
  return (
    <a
      href="https://www.producthunt.com/products/seethrough-2/launches/seethrough-2?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-seethrough-2"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block transition hover:-translate-y-0.5"
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
