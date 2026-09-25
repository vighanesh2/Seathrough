"use client";

import { useEffect, useRef } from "react";
import type { ExperimentCheck, ExperimentLesson } from "@/lib/experiment/scene";
import { BoxesLoader } from "@/components/ui/BoxesLoader";

type ExperimentScriptProps = {
  lesson: ExperimentLesson | null;
  currentBeat: number;
  streaming?: boolean;
  pausedCheck?: ExperimentCheck | null;
  note?: string;
  intro?: string;
};

export function ExperimentScript({
  lesson,
  currentBeat,
  streaming = false,
  pausedCheck = null,
  note = "",
  intro = "Ask a question. The tutor talks in short steps, draws on the board, then pauses to check you understood.",
}: ExperimentScriptProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const beats = lesson?.beats ?? [];
  const visible = beats.slice(0, Math.max(0, currentBeat + 1));

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [visible.length, currentBeat, pausedCheck, note]);

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col border-l border-board-edge bg-[#f4f8fb]"
      aria-label="Explanation script"
    >
      <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-2">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-muted">Script</p>
          <h2 className="mt-0.5 truncate font-[family-name:var(--font-newsreader)] text-[1.15rem] tracking-tight text-ink">
            {lesson?.title || "Ask a question"}
          </h2>
          {lesson?.question ? (
            <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-muted">
              {lesson.question}
            </p>
          ) : null}
        </div>
        {streaming ? (
          <span
            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success"
            aria-label="Explaining"
          />
        ) : null}
      </div>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-3"
      >
        {!lesson ? (
          streaming ? (
            <div className="flex justify-start pt-2">
              <BoxesLoader />
            </div>
          ) : (
            <p className="text-[14px] leading-6 text-muted">
              {intro}
            </p>
          )
        ) : null}

        {visible.map((beat, index) => {
          const active = index === currentBeat;
          return (
            <div
              key={`${lesson?.title ?? "beat"}-${index}`}
              className={`animate-fade-up flex gap-3 ${
                active ? "" : "opacity-80"
              }`}
            >
              <span
                className="mt-0.5 w-4 shrink-0 font-mono text-[11px] text-[#8a9aab]"
                aria-hidden
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                {beat.section ? (
                  <p className="mb-1 text-[11px] font-medium tracking-wide text-muted uppercase">
                    {beat.section}
                  </p>
                ) : null}
                <p
                  className={`text-[15px] leading-7 ${
                    active ? "text-ink" : "text-[#1e3a5f]"
                  }`}
                >
                  {beat.say}
                </p>
                {beat.example ? (
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-white px-3 py-2.5 font-mono text-[12px] leading-relaxed text-[#4a6580]">
                    {beat.example}
                  </pre>
                ) : null}
              </div>
            </div>
          );
        })}

        {pausedCheck ? (
          <div className="rounded-xl border border-[#d7e4ef] bg-white px-3 py-3">
            <p className="text-[11px] font-medium tracking-wide text-muted uppercase">
              Your turn
            </p>
            <p className="mt-1 text-[15px] leading-6 text-ink">
              {pausedCheck.ask}
            </p>
            {pausedCheck.hint ? (
              <p className="mt-1 text-[12px] text-muted">{pausedCheck.hint}</p>
            ) : null}
          </div>
        ) : null}

        {note ? (
          <p className="text-[13px] leading-6 text-[#1e3a5f]">{note}</p>
        ) : null}
      </div>
    </aside>
  );
}
