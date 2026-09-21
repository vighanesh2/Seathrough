"use client";

import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TutorVisualPlan } from "@/lib/ai-tutor/visualPlan";
import { cn } from "@/lib/utils";

function PlayBar({
  done,
  playing,
  onPlay,
  onPause,
  onStep,
  onReset,
}: {
  done: boolean;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      {done ? (
        <Button type="button" onClick={onReset}>
          <RotateCcw className="size-3.5" />
          Play again
        </Button>
      ) : playing ? (
        <Button type="button" variant="outline" onClick={onPause}>
          <Pause className="size-3.5" />
          Pause
        </Button>
      ) : (
        <Button type="button" onClick={onPlay}>
          <Play className="size-3.5" />
          Play
        </Button>
      )}
      <Button type="button" variant="outline" onClick={onStep} disabled={done}>
        <StepForward className="size-3.5" />
        Next
      </Button>
    </div>
  );
}

function useBeats(length: number) {
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(true);
  const last = Math.max(0, length - 1);
  const done = beat >= last;

  useEffect(() => {
    if (!playing || done) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(
      () => setBeat((current) => Math.min(current + 1, last)),
      reduce ? 400 : 1100,
    );
    return () => window.clearTimeout(id);
  }, [playing, beat, done, last]);

  return {
    beat,
    playing,
    done,
    play: () => {
      if (done) setBeat(0);
      setPlaying(true);
    },
    pause: () => setPlaying(false),
    step: () => {
      setPlaying(false);
      setBeat((current) => Math.min(current + 1, last));
    },
    reset: () => {
      setBeat(0);
      setPlaying(true);
    },
  };
}

export function GenrePlay({ plan }: { plan: TutorVisualPlan }) {
  const beats = plan.beats || [];
  const ctrl = useBeats(beats.length);
  const current = beats[ctrl.beat] || beats[0];
  const genre = plan.genre;
  const stages = current?.stages || plan.stages || [];

  return (
    <div>
      <p className="text-center text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
        Watch the idea
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-newsreader)] text-center text-[2.15rem] leading-tight tracking-tight text-ink sm:text-[2.6rem]">
        {plan.title || "How it works"}
      </h1>
      <p className="mx-auto mt-4 min-h-[48px] max-w-lg text-center text-[16px] leading-7 text-ink-soft">
        {current?.caption}
      </p>

      <div
        className="relative mx-auto mt-6 flex min-h-[220px] w-full max-w-lg flex-col items-center justify-center"
        aria-live="polite"
      >
        {genre === "conservation" ? (
          <div className="flex h-44 w-full items-end gap-4">
            {(current?.stores || []).map((store, index) => (
              <div key={store.name} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div
                  className={cn(
                    "w-full rounded-t-xl transition-[height] duration-500",
                    index === 0 && "bg-accent",
                    index === 1 && "bg-success",
                    index >= 2 && "bg-[#c47b2b]",
                  )}
                  style={{ height: `${Math.max(8, Number(store.amount) || 0)}%` }}
                />
                <p className="text-center text-[12px] leading-4 text-ink-soft">
                  {store.name} · {store.amount}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {genre === "comparison-over-time" ? (
          <div className="grid w-full grid-cols-2 gap-3">
            {(current?.traces || []).map((trace) => {
              const full = trace.full || trace.values || [];
              const max = Math.max(1, ...full);
              return (
                <div
                  key={trace.name}
                  className="rounded-2xl border border-board-edge bg-white px-3 py-3"
                >
                  <p className="font-medium text-ink">{trace.name}</p>
                  <div className="mt-3 flex h-24 items-end gap-1">
                    {full.map((value, index) => (
                      <div
                        key={`${trace.name}-${index}`}
                        className="flex-1 rounded-t-md bg-accent transition-[height,opacity] duration-500"
                        style={{
                          height: `${index < trace.values.length ? (value / max) * 100 : 8}%`,
                          opacity: index < trace.values.length ? 1 : 0.2,
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {genre === "map" ? (
          <div className="flex flex-wrap justify-center gap-2">
            {(current?.regions || []).map((region) => (
              <div
                key={region.name}
                className={cn(
                  "min-w-[28%] rounded-2xl border px-4 py-3 text-center text-sm transition-colors duration-500",
                  region.on
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-board-edge bg-white text-ink-soft",
                )}
              >
                {region.name}
              </div>
            ))}
          </div>
        ) : null}

        {genre === "sourced-diagram" ? (
          <div className="w-full text-center">
            {plan.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={plan.imageUrl}
                alt={plan.title}
                referrerPolicy="no-referrer"
                className="mx-auto max-h-[240px] max-w-full object-contain"
              />
            ) : null}
            {plan.imageCredit ? (
              <p className="mt-2 text-[11px] text-muted">Diagram: {plan.imageCredit}</p>
            ) : null}
          </div>
        ) : null}

        {genre === "flow" || !["conservation", "comparison-over-time", "map", "sourced-diagram"].includes(String(genre)) ? (
          <>
            <div className="flex w-full gap-2">
              {stages.map((stage, index) => (
                <div
                  key={`${stage}-${index}`}
                  className={cn(
                    "min-h-[72px] flex-1 rounded-2xl border px-2 py-3 text-center text-[12px] leading-4 transition-colors duration-500",
                    index === (current?.active ?? 0)
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-board-edge bg-white text-ink-soft",
                  )}
                >
                  {stage}
                </div>
              ))}
            </div>
            <div className="relative mt-4 h-2.5 w-full rounded-full bg-[#e8eef5]">
              <div
                className="absolute top-[-5px] size-4 rounded-full bg-accent transition-[left] duration-500"
                style={{
                  left: `calc(${
                    stages.length > 1
                      ? ((current?.tokenAt ?? current?.active ?? 0) / (stages.length - 1)) * 100
                      : 0
                  }% - 8px)`,
                }}
              />
            </div>
          </>
        ) : null}
      </div>

      <PlayBar
        done={ctrl.done}
        playing={ctrl.playing}
        onPlay={ctrl.play}
        onPause={ctrl.pause}
        onStep={ctrl.step}
        onReset={ctrl.reset}
      />
    </div>
  );
}
