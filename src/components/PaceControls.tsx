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
        className="h-9 rounded-lg border border-[var(--hairline)] bg-chalk px-3 font-mono text-xs font-medium text-ink transition hover:border-accent disabled:opacity-40"
        aria-label={playing ? "Pause lesson" : "Play lesson"}
      >
        {playing ? "❚❚ pause" : "▶ play"}
      </button>
      <button
        type="button"
        onClick={onSkip}
        disabled={disabled}
        className="h-9 rounded-lg border border-[var(--hairline)] bg-chalk px-3 font-mono text-xs font-medium text-ink transition hover:border-accent disabled:opacity-40"
        aria-label="Skip to next beat"
      >
        skip →
      </button>
      <div
        className="flex h-9 items-center gap-1 rounded-lg border border-[var(--hairline)] bg-chalk px-1"
        role="group"
        aria-label="Playback speed"
      >
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onSpeedChange(s)}
            className={`rounded-md px-2 py-1 font-mono text-xs transition disabled:opacity-40 ${
              speed === s
                ? "bg-ink text-chalk"
                : "text-ink-soft hover:bg-paper-deep"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
