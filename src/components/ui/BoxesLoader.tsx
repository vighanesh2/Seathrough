"use client";

import { cn } from "@/lib/utils";

type BoxesLoaderProps = {
  label?: string;
  className?: string;
};

/**
 * Small 2×2 square pulse, in the same family as Amazon Rufus / Amazon Q.
 */
export function BoxesLoader({ label, className }: BoxesLoaderProps) {
  return (
    <div
      className={cn("flex flex-col items-center gap-2.5", className)}
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
    >
      <span className="boxes-loader" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </span>
      {label ? (
        <p className="font-sans text-[12px] font-medium tracking-[-0.01em] text-[#6a7d90]">
          {label}
        </p>
      ) : null}
    </div>
  );
}
