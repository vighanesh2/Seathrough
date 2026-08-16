"use client";

import { Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        onClick={onTogglePlay}
        disabled={disabled}
        aria-label={playing ? "Pause lesson" : "Play lesson"}
      >
        {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        {playing ? "Pause" : "Play"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onSkip}
        disabled={disabled}
        aria-label="Skip to next beat"
      >
        <SkipForward className="size-3.5" />
        Next
      </Button>
      <div
        className="flex h-9 items-center gap-0.5 rounded-lg border border-border bg-card p-0.5"
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
              "rounded-md px-2.5 py-1 text-xs font-medium transition disabled:opacity-40",
              speed === s
                ? "bg-accent-soft text-accent-deep"
                : "text-muted hover:text-ink",
            )}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
