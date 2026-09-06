"use client";

import { useEffect, useRef } from "react";
import { formatNarrationForDisplay } from "@/lib/math/formatNarrationForDisplay";

export type BoardNarrationLine = {
  id: string;
  text: string;
  kind?: "narration" | "summary" | "error" | "student";
};

type BoardNarrationProps = {
  lines: BoardNarrationLine[];
  codeBuffer?: string;
  streaming?: boolean;
  title?: string;
  /** side = desktop rail; bottom = mobile sheet */
  placement?: "side" | "bottom";
};

function displayText(text: string): string {
  if (!text.trim()) return text;
  if (text.startsWith("[voice unavailable")) return text;
  return formatNarrationForDisplay(text);
}

/**
 * Lesson notes beside the board. Steps are numbered because they arrive
 * in teaching order — ask, then each beat, then the takeaway.
 */
export function BoardNarration({
  lines,
  codeBuffer,
  streaming,
  title,
  placement = "side",
}: BoardNarrationProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines, codeBuffer]);

  const isSide = placement === "side";
  let step = 0;

  return (
    <aside
      className={`flex min-h-0 w-full flex-col bg-[#f4f8fb] ${
        isSide
          ? "h-full border-l border-[#d7e3eb]"
          : "h-full max-h-[38dvh] border-t border-[#d7e3eb]"
      }`}
      aria-label="Lesson notes"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-2">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[#6a7d90]">Notes</p>
          {title ? (
            <h2 className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-[#17324a]">
              {title}
            </h2>
          ) : (
            <p className="mt-0.5 text-[15px] font-semibold tracking-tight text-[#17324a]">
              Follow along
            </p>
          )}
        </div>
        {streaming ? (
          <span
            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#2a7a5c]"
            aria-label="Explaining"
          />
        ) : null}
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-3"
      >
        {lines.length === 0 && !codeBuffer?.trim() ? (
          <p className="text-[14px] leading-6 text-[#6a7d90]">
            As the board draws, the spoken steps will land here so you can
            reread them.
          </p>
        ) : null}

        {lines.map((line) => {
          const text = displayText(line.text);
          const numbered =
            line.kind !== "student" &&
            line.kind !== "error" &&
            line.kind !== "summary";
          if (numbered) step += 1;
          const n = step;

          if (line.kind === "error") {
            return (
              <p
                key={line.id}
                className="animate-fade-up text-[14px] leading-6 text-error"
              >
                {text}
              </p>
            );
          }
          if (line.kind === "student") {
            return (
              <div key={line.id} className="animate-fade-up">
                <p className="text-[11px] font-medium text-[#1b6ca8]">You</p>
                <p className="mt-1 text-[14px] leading-6 text-[#17324a]">
                  {text}
                </p>
              </div>
            );
          }
          if (line.kind === "summary") {
            return (
              <p
                key={line.id}
                className="animate-fade-up border-l-2 border-[#2a7a5c] pl-3 text-[14.5px] leading-6 text-[#17324a]"
              >
                {text}
              </p>
            );
          }
          return (
            <div key={line.id} className="animate-fade-up flex gap-3">
              <span
                className="mt-0.5 w-4 shrink-0 font-mono text-[11px] text-[#8a9aab]"
                aria-hidden
              >
                {String(n).padStart(2, "0")}
              </span>
              <p className="text-[15px] leading-7 text-[#1e3a5f]">{text}</p>
            </div>
          );
        })}

        {codeBuffer?.trim() ? (
          <pre className="animate-fade-up overflow-x-auto rounded-lg bg-white px-3 py-2.5 font-mono text-[12px] leading-relaxed text-[#4a6580]">
            {codeBuffer}
          </pre>
        ) : null}
      </div>
    </aside>
  );
}
