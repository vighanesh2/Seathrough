"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_PHRASES = [
  "Thinking",
  "Mapping the idea",
  "Preparing the board",
  "Almost ready",
] as const;

type ThinkingLoaderProps = {
  /** Visible status copy; cycles through `phrases` when omitted. */
  label?: string;
  phrases?: readonly string[];
  /** inline = prompt/button; panel = rail/sidebar; overlay = full board veil */
  variant?: "inline" | "panel" | "overlay";
  className?: string;
};

/**
 * Quiet “thinking” indicator — Perplexity simplicity, Linear polish.
 * Brand blue pulse + soft shimmer; respects reduced motion.
 */
export function ThinkingLoader({
  label,
  phrases = DEFAULT_PHRASES,
  variant = "inline",
  className,
}: ThinkingLoaderProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const cycling = !label && phrases.length > 0;
  const text = label ?? phrases[phraseIndex % phrases.length] ?? "Thinking";

  useEffect(() => {
    if (!cycling) return;
    const id = window.setInterval(() => {
      setPhraseIndex((i) => i + 1);
    }, 2200);
    return () => window.clearInterval(id);
  }, [cycling]);

  if (variant === "overlay") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20 flex items-center justify-center",
          "bg-[radial-gradient(ellipse_at_50%_40%,rgba(255,255,255,0.92),rgba(250,251,252,0.72))]",
          "backdrop-blur-[2px]",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label={text}
      >
        <div className="flex flex-col items-center gap-4 px-6">
          <Orb size="lg" />
          <div className="flex flex-col items-center gap-2">
            <p className="font-sans text-[15px] font-medium tracking-[-0.01em] text-[#1a2b3c]">
              {text}
              <span className="thinking-ellipsis" aria-hidden>
                …
              </span>
            </p>
            <ShimmerBar className="w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "panel") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-xl border border-[#e6ebf0] bg-white/80 px-3.5 py-3",
          className,
        )}
        role="status"
        aria-live="polite"
        aria-label={text}
      >
        <Orb size="md" />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-sans text-[13px] font-medium text-[#1a2b3c]">
            {text}
            <span className="thinking-ellipsis" aria-hidden>
              …
            </span>
          </p>
          <ShimmerBar className="mt-2.5 w-full max-w-48" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <Orb size="sm" />
      <span className="font-sans text-[13px] font-medium text-[#3d5166]">
        {text}
        <span className="thinking-ellipsis" aria-hidden>
          …
        </span>
      </span>
    </div>
  );
}

function Orb({ size }: { size: "sm" | "md" | "lg" }) {
  const dim =
    size === "lg" ? "size-10" : size === "md" ? "size-7" : "size-4";
  return (
    <span
      className={cn("thinking-orb relative shrink-0", dim)}
      aria-hidden
    >
      <span className="thinking-orb-core absolute inset-[18%] rounded-full bg-[#1b6ca8]" />
      <span className="thinking-orb-ring absolute inset-0 rounded-full border border-[#1b6ca8]/35" />
      <span className="thinking-orb-glow absolute -inset-1 rounded-full bg-[#1b6ca8]/15" />
    </span>
  );
}

function ShimmerBar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "thinking-shimmer block h-1 overflow-hidden rounded-full bg-[#eef2f6]",
        className,
      )}
      aria-hidden
    >
      <span className="thinking-shimmer-beam block h-full w-1/2 rounded-full bg-linear-to-r from-transparent via-[#1b6ca8]/55 to-transparent" />
    </span>
  );
}
