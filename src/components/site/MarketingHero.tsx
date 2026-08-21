"use client";

import { useState } from "react";
import { ArrowUp, Atom, MessageCircleQuestion, Network } from "lucide-react";
import { useStudioAccess } from "@/components/site/StudioAccess";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  {
    label: "Why do planets orbit the sun?",
    href: "/scene-explain",
    icon: Atom,
  },
  {
    label: "Design a URL shortener",
    href: "/system-design",
    icon: Network,
  },
  {
    label: "How does a hash map work?",
    href: "/lessons",
    icon: MessageCircleQuestion,
  },
] as const;

const PENDING_PROMPT_KEY = "seethrough.pendingPrompt";

export function MarketingHero() {
  const { openStudio } = useStudioAccess();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  function go(href: string, prompt?: string) {
    const text = (prompt ?? query).trim();
    if (text) {
      try {
        sessionStorage.setItem(PENDING_PROMPT_KEY, text);
      } catch {
        /* ignore */
      }
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
    <section className="relative px-5 pt-16 pb-16 md:px-6 md:pt-24 md:pb-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-[2.4rem] leading-[1.1] font-medium tracking-[-0.04em] text-[#1a2b3c] sm:text-5xl md:text-[3.25rem]">
          Ask anything.
          <br />
          <span className="text-[#1b6ca8]">Watch it get drawn.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[16px] leading-7 text-[#6a7d90]">
          Type a question. SeeThrough draws the steps while it explains — on a
          board, as a system map, or in 3D.
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
              ? "border-[#1b6ca8]/45 shadow-[0_1px_2px_rgba(26,43,60,0.04),0_12px_32px_-12px_rgba(27,108,168,0.28)]"
              : "border-[#e6ebf0]",
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

      <div className="mx-auto mt-14 max-w-3xl md:mt-16">
        <p className="mb-3 text-center text-[12px] font-medium tracking-[0.08em] text-[#8a9aab] uppercase">
          Visual output
        </p>
        <HeroVisual
          onOpen={() =>
            go(
              "/scene-explain",
              query.trim() || "Why do planets orbit the sun?",
            )
          }
        />
      </div>
    </section>
  );
}

function HeroVisual({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full overflow-hidden rounded-2xl border border-[#e6ebf0] bg-white text-left shadow-[0_16px_48px_-24px_rgba(26,43,60,0.18)] outline-none transition hover:border-[#c8d6e4] focus-visible:ring-3 focus-visible:ring-[#1b6ca8]/30"
      aria-label="Open 3D scenes and explore the solar system"
    >
      <div className="flex items-center justify-between border-b border-[#eef2f6] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-[#eef4f9] text-[#1b6ca8]">
            <Atom className="size-3.5" />
          </span>
          <span className="text-[13px] font-medium text-[#1a2b3c]">3D scenes</span>
          <span className="hidden text-[12px] text-[#8a9aab] sm:inline">
            · the solar system
          </span>
        </div>
        <span className="text-[12px] text-[#8a9aab] transition group-hover:text-[#1b6ca8]">
          Open →
        </span>
      </div>

      <div className="relative aspect-16/10 bg-[#f7f9fb] sm:aspect-2/1">
        <UniversePreview />
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-white/90 to-transparent px-4 pt-10 pb-4 sm:px-5">
          <p className="text-[13px] font-medium text-[#1a2b3c]">
            Gravity holds the orbits
          </p>
          <p className="mt-0.5 text-[12px] text-[#6a7d90]">
            Drawn as a scene while it explains why planets keep circling
          </p>
        </div>
      </div>
    </button>
  );
}

/**
 * Circular orbits only. Each planet sits on a ring radius and rotates
 * around the sun with SVG animateTransform — no CSS, no ellipses.
 */
function UniversePreview() {
  return (
    <svg
      viewBox="0 0 640 320"
      className="h-full w-full"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      {Array.from({ length: 11 }, (_, i) => (
        <line
          key={`h-${i}`}
          x1="0"
          y1={i * 32}
          x2="640"
          y2={i * 32}
          stroke="rgba(27,108,168,0.07)"
        />
      ))}
      {Array.from({ length: 21 }, (_, i) => (
        <line
          key={`v-${i}`}
          x1={i * 32}
          y1="0"
          x2={i * 32}
          y2="320"
          stroke="rgba(27,108,168,0.07)"
        />
      ))}

      <g transform="translate(320 150)">
        <circle r="168" fill="rgba(27,108,168,0.04)" />

        <circle
          r="58"
          fill="none"
          stroke="#b7c9d8"
          strokeWidth="1.2"
          strokeDasharray="4 5"
        />
        <circle
          r="100"
          fill="none"
          stroke="#1b6ca8"
          strokeWidth="1.5"
          opacity="0.55"
        />
        <circle
          r="142"
          fill="none"
          stroke="#c8d6e4"
          strokeWidth="1.2"
          strokeDasharray="3 6"
        />

        {/* Mercury on r=58 */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="7s"
            repeatCount="indefinite"
          />
          <circle cx="58" cy="0" r="5" fill="#8a9aab" />
        </g>

        {/* Earth + moon on r=100 */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="40"
            to="400"
            dur="14s"
            repeatCount="indefinite"
          />
          <circle cx="100" cy="0" r="9" fill="#0f4f7c" />
          <g transform="translate(100 0)">
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to="360"
                dur="3.5s"
                repeatCount="indefinite"
              />
              <circle cx="16" cy="0" r="3.5" fill="#7eb6d9" />
            </g>
          </g>
        </g>

        {/* Mars on r=142 */}
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="200"
            to="560"
            dur="22s"
            repeatCount="indefinite"
          />
          <circle cx="142" cy="0" r="7" fill="#5a7a96" />
        </g>

        <circle r="20" fill="#1b6ca8" />
        <circle
          r="30"
          fill="none"
          stroke="#1b6ca8"
          strokeWidth="1"
          opacity="0.28"
          className="animate-soft-pulse"
        />
        <text
          y="4"
          textAnchor="middle"
          fontSize="10"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight="600"
          fill="#ffffff"
        >
          Sun
        </text>

        <g className="animate-gravity-fade">
          <path
            d="M88 -28 C 62 -18, 40 -8, 24 -2"
            fill="none"
            stroke="#1b6ca8"
            strokeWidth="1.6"
            strokeLinecap="round"
            markerEnd="url(#grav-arrow)"
          />
          <text
            x="48"
            y="-34"
            fontSize="10"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fill="#1b6ca8"
          >
            gravity
          </text>
        </g>
      </g>

      <text
        x="420"
        y="268"
        textAnchor="middle"
        fontSize="11"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="600"
        fill="#0f4f7c"
      >
        Earth
      </text>
      <text
        x="500"
        y="286"
        textAnchor="middle"
        fontSize="10"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fill="#6a7d90"
      >
        Mars
      </text>

      <defs>
        <marker
          id="grav-arrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6 Z" fill="#1b6ca8" />
        </marker>
      </defs>
    </svg>
  );
}
