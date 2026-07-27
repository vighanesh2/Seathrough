"use client";

import type { PaceSpeed } from "@/types/lesson";

type PaceControlsProps = {
  playing: boolean;
  speed: PaceSpeed;
  onTogglePlay: () => void;
  onSpeedChange: (speed: PaceSpeed) => void;
  onSkip: () => void;
  disabled?: boolean;
};

const SPEEDS: PaceSpeed[] = [0.75, 1, 1.25];

export function PaceControls({
  playing,
  speed,
  onTogglePlay,
  onSpeedChange,
  onSkip,
  disabled,
}: PaceControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={disabled}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 font-sans text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-40"
        aria-label={playing ? "Pause lesson" : "Play lesson"}
      >
        <span aria-hidden className="text-xs">
          {playing ? "❚❚" : "▶"}
        </span>
        {playing ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={onSkip}
        disabled={disabled}
        className="h-10 rounded-xl border border-board-edge bg-chalk px-4 font-sans text-sm font-medium text-ink-soft transition hover:border-accent hover:text-accent disabled:opacity-40"
        aria-label="Skip to next beat"
      >
        Next
      </button>
      <div
        className="flex h-10 items-center gap-0.5 rounded-xl border border-board-edge bg-chalk p-1"
        role="group"
        aria-label="Playback speed"
      >
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onSpeedChange(s)}
            className={`rounded-lg px-2.5 py-1.5 font-sans text-xs font-medium transition disabled:opacity-40 ${
              speed === s
                ? "bg-accent-soft text-accent-deep"
                : "text-muted hover:text-ink"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
