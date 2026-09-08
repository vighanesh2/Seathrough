"use client";

import { Pause, Play, SkipForward } from "lucide-react";
import type { PaceSpeed } from "@/types/lesson";
import { cn } from "@/lib/utils";

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
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={disabled}
        aria-label={playing ? "Pause" : "Play"}
        className="grid size-8 place-items-center rounded-lg text-[#3d5166] transition hover:bg-[#eef4f9] hover:text-[#17324a] disabled:opacity-40"
      >
        {playing ? (
          <Pause className="size-3.5" />
        ) : (
          <Play className="size-3.5" />
        )}
      </button>
      <button
        type="button"
        onClick={onSkip}
        disabled={disabled}
        aria-label="Next step"
        className="grid size-8 place-items-center rounded-lg text-[#3d5166] transition hover:bg-[#eef4f9] hover:text-[#17324a] disabled:opacity-40"
      >
        <SkipForward className="size-3.5" />
      </button>
      <div
        className="ml-0.5 flex items-center rounded-lg p-0.5"
        role="group"
        aria-label="Playback speed"
      >
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onSpeedChange(s)}
            className={cn(
              "rounded-md px-1.5 py-1 text-[11px] font-medium transition disabled:opacity-40",
              speed === s
                ? "text-[#1b6ca8]"
                : "text-[#8a9aab] hover:text-[#17324a]",
            )}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
