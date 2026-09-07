"use client";

import { ArrowRight } from "lucide-react";
import { useStudioAccess } from "@/components/site/StudioAccess";
import { stashPendingPrompt } from "@/lib/usage/pendingPrompt";
import { cn } from "@/lib/utils";

const EXAMPLE = "How does matrix multiplication work?";

/**
 * Math section — visual matches the real Topics board:
 * title, formula, narration, A/B with colored brackets on a ruled grid.
 */
export function MarketingMathSection() {
  const { openStudio } = useStudioAccess();

  function openExample() {
    try {
      stashPendingPrompt(EXAMPLE, true);
    } catch {
      /* ignore */
    }
    openStudio("/lessons");
  }

  return (
    <section className="px-5 py-16 md:px-6 md:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="max-w-lg">
          <p className="text-[12px] font-medium tracking-[0.08em] text-[#8a9aab] uppercase">
            Topics
          </p>
          <h2 className="mt-2 text-[1.75rem] leading-tight font-medium tracking-[-0.03em] text-[#1a2b3c] md:text-[2.15rem]">
            Math, drawn one step at a time.
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-[#6a7d90]">
            Equations and matrices appear on the board as they are explained, so
            you see each move, not just the final answer.
          </p>
        </div>

        <button
          type="button"
          onClick={openExample}
          className="group mt-10 w-full overflow-hidden rounded-2xl border border-[#e6ebf0] bg-white text-left shadow-[0_12px_40px_-24px_rgba(26,43,60,0.16)] outline-none transition hover:border-[#c8d6e4] focus-visible:ring-3 focus-visible:ring-[#1b6ca8]/30"
          aria-label={`Try: ${EXAMPLE}`}
        >
          <div className="flex items-center justify-between border-b border-[#eef2f6] px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="rounded-md bg-[#eef4f9] px-2 py-0.5 font-mono text-[11px] text-[#1b6ca8]">
                Example
              </span>
              <span className="truncate text-[13px] text-[#3d5166]">
                {EXAMPLE}
              </span>
            </div>
            <span className="shrink-0 text-[12px] text-[#8a9aab] transition group-hover:text-[#1b6ca8]">
              Open →
            </span>
          </div>

          <div className="relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10">
            <div
              className="board-surface pointer-events-none absolute inset-0 opacity-70"
              aria-hidden
            />
            <div className="relative">
              <BoardMatrixLesson />
            </div>
          </div>
        </button>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={openExample}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#1b6ca8] transition hover:text-[#0f4f7c]"
          >
            Explain this on the board
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function BoardMatrixLesson() {
  return (
    <div className="mx-auto grid max-w-2xl items-start gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10">
      <div className="min-w-0">
        <h3 className="text-[1.35rem] font-semibold tracking-[-0.02em] text-[#1a2b3c] sm:text-[1.5rem]">
          Matrix multiplication
        </h3>
        <p className="mt-2 font-mono text-[14px] text-[#1b6ca8] sm:text-[15px]">
          (AB)<sub className="text-[11px]">ij</sub> = row<sub className="text-[11px]">i</sub> ·
          col<sub className="text-[11px]">j</sub>
        </p>
        <p className="mt-5 text-[14px] leading-6 text-[#1a2b3c]">
          Two matrices. A on the left, B on the right.
        </p>
        <p className="mt-2 text-[14px] leading-6 text-[#6a7d90]">
          Inner sizes match (2 and 2), so they can multiply.
        </p>
      </div>

      <div className="flex items-end justify-center gap-5 sm:gap-7 md:justify-end">
        <BoardMatrix
          label="A"
          accent="#1b6ca8"
          values={[
            [1, 2],
            [3, 4],
          ]}
        />
        <BoardMatrix
          label="B"
          accent="#b86a1e"
          values={[
            [5, 6],
            [7, 8],
          ]}
        />
      </div>
    </div>
  );
}

function BoardMatrix({
  label,
  accent,
  values,
}: {
  label: string;
  accent: string;
  values: ReadonlyArray<ReadonlyArray<number>>;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="text-[15px] font-semibold"
        style={{ color: accent }}
      >
        {label}
      </span>
      <div className="relative px-3 py-2">
        {/* Left bracket */}
        <span
          className="pointer-events-none absolute top-0 bottom-0 left-0 w-2.5 rounded-l-[3px] border-t-2 border-b-2 border-l-2"
          style={{ borderColor: accent }}
          aria-hidden
        />
        {/* Right bracket */}
        <span
          className="pointer-events-none absolute top-0 right-0 bottom-0 w-2.5 rounded-r-[3px] border-t-2 border-b-2 border-r-2"
          style={{ borderColor: accent }}
          aria-hidden
        />
        <div
          className="grid grid-cols-2 gap-x-5 gap-y-2 px-2 py-1"
          role="img"
          aria-label={`Matrix ${label}`}
        >
          {values.map((row, r) =>
            row.map((value, c) => (
              <span
                key={`${r}-${c}`}
                className={cn(
                  "flex size-8 items-center justify-center font-mono text-[16px] tabular-nums text-[#1a2b3c] sm:size-9 sm:text-[17px]",
                )}
              >
                {value}
              </span>
            )),
          )}
        </div>
      </div>
    </div>
  );
}
