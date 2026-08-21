"use client";

type HeroWorkspaceProps = {
  onOpen: (href: string) => void;
};

export function HeroWorkspace({ onOpen }: HeroWorkspaceProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen("/lessons")}
      className="group relative mx-auto block w-full max-w-5xl text-left outline-none"
      aria-label="Open Topics and start an explanation"
    >
      <div
        className="pointer-events-none absolute -inset-x-16 -top-10 h-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(27,108,168,0.38),transparent_68%)] blur-2xl"
        aria-hidden
      />
      <div className="relative origin-top overflow-hidden rounded-xl border border-white/10 bg-[#0e1622] shadow-[0_40px_80px_-24px_rgba(0,0,0,0.7)] ring-1 ring-white/5 transition duration-300 [transform:perspective(1600px)_rotateX(4deg)] group-hover:border-white/16 group-focus-visible:ring-2 group-focus-visible:ring-[#5ba3d9]/50">
        <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
          </span>
          <span className="ml-3 text-[13px] font-medium text-white/80">
            SeeThrough
          </span>
          <span className="rounded-md bg-white/8 px-2 py-0.5 text-[11px] text-white/50">
            Topics
          </span>
          <span className="ml-auto hidden text-[11px] text-white/35 sm:inline">
            binary search
          </span>
        </div>

        <div className="grid min-h-88 md:min-h-112 md:grid-cols-[13.5rem_minmax(0,1fr)_14rem]">
          <aside className="hidden border-r border-white/8 p-4 md:block">
            <p className="text-[11px] font-medium tracking-wide text-white/35 uppercase">
              Ask
            </p>
            <p className="mt-3 text-[13px] leading-6 text-white/80">
              How does binary search find an item without checking every one?
            </p>
            <div className="mt-4 rounded-lg border border-white/10 bg-white/4 px-3 py-2 text-[12px] text-white/45">
              Explain on the board
            </div>
          </aside>

          <div className="relative bg-[#f4f7fb]">
            <BoardSketch />
          </div>

          <aside className="hidden border-l border-white/8 p-4 md:block">
            <p className="text-[11px] font-medium tracking-wide text-white/35 uppercase">
              Activity
            </p>
            <ul className="mt-3 space-y-3 text-[12.5px] leading-5 text-white/65">
              <li>
                <span className="text-white/40">now · </span>
                Drawing the sorted array
              </li>
              <li>
                <span className="text-white/40">2s · </span>
                Marking the midpoint
              </li>
              <li>
                <span className="text-white/40">4s · </span>
                Discarding the right half
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </button>
  );
}

function BoardSketch() {
  return (
    <svg
      viewBox="0 0 520 320"
      className="h-full w-full"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="520" height="320" fill="#f4f7fb" />
      {Array.from({ length: 11 }, (_, i) => (
        <line
          key={`h-${i}`}
          x1="0"
          y1={i * 32}
          x2="520"
          y2={i * 32}
          stroke="rgba(27,108,168,0.08)"
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: 17 }, (_, i) => (
        <line
          key={`v-${i}`}
          x1={i * 32}
          y1="0"
          x2={i * 32}
          y2="320"
          stroke="rgba(27,108,168,0.08)"
          strokeWidth="1"
        />
      ))}
      {[2, 5, 8, 12, 16, 23, 31, 40].map((n, i) => {
        const x = 48 + i * 54;
        const active = i === 3;
        return (
          <g key={n}>
            <rect
              x={x}
              y="118"
              width="44"
              height="44"
              rx="8"
              fill={active ? "#1b6ca8" : "#ffffff"}
              stroke={active ? "#0f4f7c" : "#c8d6e4"}
              strokeWidth="1.5"
            />
            <text
              x={x + 22}
              y="145"
              textAnchor="middle"
              fontSize="14"
              fontFamily="ui-sans-serif, system-ui"
              fill={active ? "#ffffff" : "#1a2b3c"}
            >
              {n}
            </text>
          </g>
        );
      })}
      <path
        d="M70 200 C 140 200, 200 88, 318 140"
        fill="none"
        stroke="#1b6ca8"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="animate-stroke-draw"
      />
      <text
        x="48"
        y="52"
        fill="#0f4f7c"
        fontSize="13"
        fontFamily="ui-sans-serif, system-ui"
        fontWeight="600"
      >
        Look at the middle first
      </text>
    </svg>
  );
}
