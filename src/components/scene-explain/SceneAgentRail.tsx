"use client";

import { useEffect, useRef } from "react";
import { ThinkingLoader } from "@/components/ui/ThinkingLoader";
import type { SceneAgentLine } from "@/lib/scene-explain/types";

type SceneAgentRailProps = {
  title?: string;
  streaming: boolean;
  logs: SceneAgentLine[];
  narration: string[];
  emptyHint: string;
};

export function SceneAgentRail({
  title,
  streaming,
  logs,
  narration,
  emptyHint,
}: SceneAgentRailProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs, narration]);

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col border-l border-board-edge bg-chalk/95 backdrop-blur-md"
      aria-label="Scene agent"
    >
      <div className="shrink-0 border-b border-board-edge px-5 py-3.5">
        <div className="flex w-full items-center gap-2">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-deep">
            Scene agent
          </p>
          {streaming ? (
            <ThinkingLoader variant="inline" label="Working" className="ml-auto" />
          ) : null}
        </div>
        <h2 className="mt-1 font-display text-base font-semibold leading-snug text-ink md:text-lg">
          {title || "3D scene explanation"}
        </h2>
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4"
      >
        {logs.length === 0 && narration.length === 0 ? (
          <p className="font-display text-base italic text-muted">{emptyHint}</p>
        ) : null}

        {logs.map((line) => (
          <p
            key={line.id}
            className={
              line.kind === "error"
                ? "font-sans text-sm text-error"
                : line.kind === "fix"
                  ? "font-sans text-sm text-warn"
                  : line.kind === "ready"
                    ? "font-sans text-sm text-success"
                    : "font-sans text-[13px] text-muted"
            }
          >
            {line.text}
          </p>
        ))}

        {narration.map((text, i) => (
          <p
            key={`n-${i}-${text.slice(0, 12)}`}
            className="animate-fade-up font-display text-[16px] leading-[1.55] text-marker"
          >
            {text}
          </p>
        ))}
      </div>
    </aside>
  );
}
