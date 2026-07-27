"use client";

import { useEffect, useRef } from "react";

type CliLine =
  | { kind: "system"; text: string }
  | { kind: "narration"; text: string }
  | { kind: "code"; text: string; highlight?: string }
  | { kind: "summary"; text: string };

type CliTutorProps = {
  lines: CliLine[];
  codeBuffer: string;
  highlight?: string;
  streaming?: boolean;
  title?: string;
};

export function CliTutor({
  lines,
  codeBuffer,
  highlight,
  streaming,
  title,
}: CliTutorProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines, codeBuffer]);

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-shell)] border border-board-edge bg-terminal shadow-[var(--shadow-shell)]"
      aria-label="CLI tutor"
    >
      <header className="flex items-center gap-2 border-b border-terminal-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e06c60]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#e5c07b]" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-[#7dcea0]" aria-hidden />
        <div className="ml-2 min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
            tutor · cli
          </p>
          <h2 className="truncate font-mono text-xs text-[#c8d5cd]">
            {title ?? "visual-education — ready"}
          </h2>
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4 font-mono text-[13px] leading-relaxed"
      >
        {lines.length === 0 && (
          <p className="text-[#6f8078]">
            $ waiting for prompt…
            <br />
            <span className="text-[#8fa398]">
              # visuals sync here token-by-token — not AI chain-of-thought
            </span>
          </p>
        )}

        {lines.map((line, i) => {
          if (line.kind === "system") {
            return (
              <p key={i} className="animate-fade-up text-[#8fa398]">
                {line.text}
              </p>
            );
          }
          if (line.kind === "narration") {
            return (
              <p key={i} className="animate-fade-up text-[#d7e2db]">
                <span className="text-accent">›</span> {line.text}
              </p>
            );
          }
          if (line.kind === "summary") {
            return (
              <pre
                key={i}
                className="animate-fade-up whitespace-pre-wrap rounded-lg border border-terminal-line bg-terminal-panel p-3 text-[#cfe6d9]"
              >
                <span className="text-warn">// how you&apos;d think it through</span>
                {"\n"}
                {line.text}
              </pre>
            );
          }
          return (
            <pre
              key={i}
              className="animate-fade-up whitespace-pre-wrap text-code"
            >
              {line.text}
            </pre>
          );
        })}

        {codeBuffer.length > 0 && (
          <pre
            className={`whitespace-pre-wrap text-code ${streaming ? "caret-blink" : ""}`}
          >
            {highlightCode(codeBuffer, highlight)}
          </pre>
        )}
      </div>
    </section>
  );
}

function highlightCode(code: string, highlight?: string) {
  if (!highlight || !code.includes(highlight)) return code;
  const parts = code.split(highlight);
  return parts.flatMap((part, index) =>
    index < parts.length - 1
      ? [
          part,
          <mark
            key={index}
            className="rounded bg-[var(--glow)] px-0.5 text-[#e8fff4]"
          >
            {highlight}
          </mark>,
        ]
      : [part],
  );
}

export type { CliLine };
