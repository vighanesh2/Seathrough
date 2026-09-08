"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type PlateId = "topics";

const PLATES: Array<{
  id: PlateId;
  href: string;
  label: string;
  tilt: string;
  offset: string;
  z: string;
}> = [
  {
    id: "topics",
    href: "/lessons",
    label: "Topics",
    tilt: "-rotate-2",
    offset: "translate-x-0",
    z: "z-10",
  },
];

type AcetateStageProps = {
  onOpen: (href: string) => void;
};

export function AcetateStage({ onOpen }: AcetateStageProps) {
  const [active, setActive] = useState<PlateId>("topics");

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div
        className="animate-lamp pointer-events-none absolute -top-10 left-1/2 h-28 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(212,232,246,0.95),rgba(27,108,168,0.22),transparent)] blur-md"
        aria-hidden
      />

      <div className="relative aspect-5/4 rounded-[1.75rem] border border-board-edge/80 bg-[linear-gradient(180deg,#f7fbfe_0%,#e7eef6_100%)] p-6 shadow-(--shadow-board) sm:p-8">
        <div
          className="board-surface absolute inset-4 rounded-2xl opacity-70"
          aria-hidden
        />
        <div className="absolute inset-x-10 top-5 h-px bg-linear-to-r from-transparent via-accent/50 to-transparent" />

        <div className="relative flex h-full items-center justify-center">
          {PLATES.map((plate) => {
            const focused = active === plate.id;
            return (
              <button
                key={plate.id}
                type="button"
                onMouseEnter={() => setActive(plate.id)}
                onFocus={() => setActive(plate.id)}
                onClick={() => onOpen(plate.href)}
                className={cn(
                  "animate-acetate acetate-plate absolute h-[72%] w-[52%] rounded-xl p-3 transition duration-300 ease-out",
                  plate.tilt,
                  plate.offset,
                  plate.z,
                  focused
                    ? "z-40 scale-105 bg-white/85 ring-2 ring-accent/35"
                    : "hover:bg-white/80",
                )}
                aria-label={`Open ${plate.label}`}
              >
                <p className="font-mono text-[10px] tracking-[0.16em] text-accent-deep uppercase">
                  {plate.label}
                </p>
                <div className="mt-2 h-[calc(100%-1.5rem)]">
                  <TopicSketch />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TopicSketch() {
  return (
    <svg viewBox="0 0 160 120" className="h-full w-full" aria-hidden>
      <line
        x1="18"
        y1="100"
        x2="142"
        y2="100"
        stroke="#1b6ca8"
        strokeWidth="1.4"
        opacity="0.45"
      />
      <line
        x1="28"
        y1="18"
        x2="28"
        y2="104"
        stroke="#1b6ca8"
        strokeWidth="1.4"
        opacity="0.45"
      />
      <path
        d="M28 96 C 58 96, 72 40, 132 22"
        fill="none"
        stroke="#1b6ca8"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="animate-stroke-draw"
      />
      <text
        x="96"
        y="44"
        fill="#0f4f7c"
        fontSize="11"
        fontFamily="Fraunces, Georgia, serif"
      >
        y = x²
      </text>
    </svg>
  );
}
