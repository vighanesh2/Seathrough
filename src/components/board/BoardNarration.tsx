"use client";

import { useEffect, useRef } from "react";

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

/**
 * Narration panel — lives beside (or under) the infinite canvas.
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

  const empty = lines.length === 0 && !codeBuffer?.trim();
  const isSide = placement === "side";

  return (
    <aside
      className={`flex min-h-0 w-full flex-col bg-chalk/95 backdrop-blur-md ${
        isSide
          ? "h-full border-l border-board-edge"
          : "h-full max-h-[42dvh] border-t border-board-edge shadow-[0_-8px_30px_rgba(26,43,60,0.08)]"
      }`}
      aria-label="Board narration"
    >
      <div className="shrink-0 border-b border-board-edge px-5 py-3.5">
        <div className="flex items-center gap-2">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-deep">
            Teacher explains
          </p>
          {streaming ? (
            <span
              className="h-2 w-2 rounded-full bg-success"
              style={{ animation: "soft-pulse 1.4s ease-in-out infinite" }}
            />
          ) : null}
        </div>
        {title ? (
          <h2 className="mt-1 font-display text-base font-semibold leading-snug text-ink md:text-lg">
            {title}
          </h2>
        ) : (
          <p className="mt-1 font-sans text-sm text-muted">Waiting for a lesson</p>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-5 py-4"
      >
        {empty ? (
          <p className="font-display text-base italic text-muted">
            Narration appears here while the board draws beside you.
          </p>
        ) : null}

        {lines.map((line) => {
          if (line.kind === "error") {
            return (
              <p
                key={line.id}
                className="animate-fade-up font-sans text-sm text-error"
              >
                {line.text}
              </p>
            );
          }
          if (line.kind === "student") {
            return (
              <div
                key={line.id}
                className="animate-fade-up rounded-xl border border-accent/25 bg-accent-soft/50 px-3 py-2.5"
              >
                <p className="mb-1 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-deep">
                  You asked
                </p>
                <p className="font-sans text-[15px] leading-relaxed text-ink">
                  {line.text}
                </p>
              </div>
            );
          }
          if (line.kind === "summary") {
            return (
              <p
                key={line.id}
                className="animate-fade-up border-l-[3px] border-success bg-success-soft/60 py-1.5 pl-3 font-sans text-[15px] leading-relaxed text-ink"
              >
                {line.text}
              </p>
            );
          }
          return (
            <p
              key={line.id}
              className="animate-fade-up font-display text-[16px] leading-[1.55] text-marker"
            >
              {line.text}
            </p>
          );
        })}

        {codeBuffer?.trim() ? (
          <pre className="animate-fade-up overflow-x-auto rounded-xl border border-board-edge bg-paper px-3 py-2.5 font-mono text-[12px] leading-relaxed text-marker-soft">
            {codeBuffer}
          </pre>
        ) : null}
      </div>
    </aside>
  );
}
