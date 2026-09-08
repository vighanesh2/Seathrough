"use client";

import { useEffect, useRef } from "react";
import type { SceneAgentLine } from "@/lib/scene-explain/types";

type SceneAgentRailProps = {
  title?: string;
  streaming: boolean;
  logs: SceneAgentLine[];
  narration: string[];
  emptyHint: string;
  /** side = desktop rail; bottom = mobile sheet */
  placement?: "side" | "bottom";
};

/**
 * Scene notes beside the 3D viewport — matches BoardNarration lesson notes.
 */
export function SceneAgentRail({
  title,
  streaming,
  logs,
  narration,
  emptyHint,
  placement = "side",
}: SceneAgentRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs, narration]);

  const isSide = placement === "side";
  const statusLogs = logs.filter((line) => line.kind !== "error");
  const errorLogs = logs.filter((line) => line.kind === "error");

  return (
    <aside
      className={`flex min-h-0 w-full flex-col bg-[#f4f8fb] ${
        isSide
          ? "h-full border-l border-[#d7e3eb]"
          : "h-full max-h-[38dvh] border-t border-[#d7e3eb]"
      }`}
      aria-label="Scene notes"
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
        {logs.length === 0 && narration.length === 0 ? (
          <p className="text-[14px] leading-6 text-[#6a7d90]">{emptyHint}</p>
        ) : null}

        {errorLogs.map((line) => (
          <p
            key={line.id}
            className="animate-fade-up text-[14px] leading-6 text-error"
          >
            {line.text}
          </p>
        ))}

        {statusLogs.length > 0 && narration.length === 0 ? (
          <div className="space-y-2">
            {statusLogs.map((line) => (
              <p
                key={line.id}
                className={
                  line.kind === "ready"
                    ? "text-[13px] leading-5 text-[#2a7a5c]"
                    : line.kind === "fix"
                      ? "text-[13px] leading-5 text-[#b45309]"
                      : "text-[13px] leading-5 text-[#6a7d90]"
                }
              >
                {line.text}
              </p>
            ))}
          </div>
        ) : null}

        {narration.map((text, i) => (
          <div
            key={`n-${i}-${text.slice(0, 12)}`}
            className="animate-fade-up flex gap-3"
          >
            <span
              className="mt-0.5 w-4 shrink-0 font-mono text-[11px] text-[#8a9aab]"
              aria-hidden
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="text-[15px] leading-7 text-[#1e3a5f]">{text}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
