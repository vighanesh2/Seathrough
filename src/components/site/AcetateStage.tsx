"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type PlateId = "topics" | "screenshots" | "scenes";

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
    tilt: "-rotate-6",
    offset: "-translate-x-[18%] translate-y-3",
    z: "z-10",
  },
  {
    id: "screenshots",
    href: "/image-explain",
    label: "Screenshots",
    tilt: "rotate-1",
    offset: "translate-x-[2%] -translate-y-1",
    z: "z-20",
  },
  {
    id: "scenes",
    href: "/scene-explain",
    label: "3D",
    tilt: "rotate-6",
    offset: "translate-x-[22%] translate-y-4",
    z: "z-30",
  },
];

type AcetateStageProps = {
  onOpen: (href: string) => void;
};

export function AcetateStage({ onOpen }: AcetateStageProps) {
  const [active, setActive] = useState<PlateId>("scenes");

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
                  "animate-acetate acetate-plate absolute h-[68%] w-[46%] rounded-xl p-3 transition duration-300 ease-out",
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
                  {plate.id === "topics" ? <TopicSketch /> : null}
                  {plate.id === "screenshots" ? <ScreenshotSketch /> : null}
                  {plate.id === "scenes" ? <SceneSketch /> : null}
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

function ScreenshotSketch() {
  return (
    <svg viewBox="0 0 160 120" className="h-full w-full" aria-hidden>
      <rect
        x="8"
        y="44"
        width="36"
        height="28"
        rx="4"
        fill="#e8f2fa"
        stroke="#1b6ca8"
        strokeWidth="1.6"
      />
      <rect
        x="62"
        y="36"
        width="40"
        height="44"
        rx="4"
        fill="#d4e8f6"
        stroke="#0f4f7c"
        strokeWidth="1.6"
      />
      <rect
        x="116"
        y="44"
        width="36"
        height="28"
        rx="4"
        fill="#e8f2fa"
        stroke="#1b6ca8"
        strokeWidth="1.6"
      />
      <path
        d="M46 58 H60"
        stroke="#0c3558"
        strokeWidth="1.6"
        markerEnd="url(#arr)"
      />
      <path
        d="M104 58 H114"
        stroke="#0c3558"
        strokeWidth="1.6"
        markerEnd="url(#arr)"
      />
      <defs>
        <marker
          id="arr"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6 Z" fill="#0c3558" />
        </marker>
      </defs>
      <text x="12" y="62" fontSize="7" fill="#0f4f7c">
        Client
      </text>
      <text x="68" y="62" fontSize="7" fill="#0c3558">
        API
      </text>
      <text x="121" y="62" fontSize="7" fill="#0f4f7c">
        DB
      </text>
    </svg>
  );
}

function SceneSketch() {
  return (
    <svg viewBox="0 0 160 120" className="h-full w-full" aria-hidden>
      <ellipse
        cx="80"
        cy="64"
        rx="54"
        ry="22"
        fill="none"
        stroke="#1b6ca8"
        strokeWidth="1.2"
        opacity="0.5"
      />
      <circle cx="80" cy="64" r="12" fill="#0f4f7c" />
      <g className="animate-orbit origin-center">
        <circle cx="134" cy="64" r="6" fill="#7eb6d9" />
      </g>
    </svg>
  );
}
