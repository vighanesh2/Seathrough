"use client";

import { ArrowRight } from "lucide-react";
import { useStudioAccess } from "@/components/site/StudioAccess";

/**
 * Body section — Gamma visual cards, Notion organization,
 * Brilliant one-liners, Linear polish. Opens Explore the body.
 */
export function MarketingBodySection() {
  const { openStudio } = useStudioAccess();

  return (
    <section className="px-5 py-16 md:px-6 md:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="max-w-lg">
          <p className="text-[12px] font-medium tracking-[0.08em] text-[#8a9aab] uppercase">
            Explore the body
          </p>
          <h2 className="mt-2 text-[1.75rem] leading-tight font-medium tracking-[-0.03em] text-[#1a2b3c] md:text-[2.15rem]">
            Turn real anatomy in 3D.
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-[#6a7d90]">
            Spin a model, tap a part, ask what it does: the same 3D figures as
            in the app.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <BodyCard
            title="Heart"
            line="See chambers pump blood, then ask about any part."
            onOpen={() => openStudio("/3d-figures")}
          >
            <HeartPreview />
          </BodyCard>
          <BodyCard
            title="Eye"
            line="Follow light through the eye to the retina."
            onOpen={() => openStudio("/3d-figures")}
          >
            <EyePreview />
          </BodyCard>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => openStudio("/3d-figures")}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#1b6ca8] transition hover:text-[#0f4f7c]"
          >
            Open 3D body
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function BodyCard({
  title,
  line,
  onOpen,
  children,
}: {
  title: string;
  line: string;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-2xl border border-[#e6ebf0] bg-white text-left shadow-[0_12px_40px_-24px_rgba(26,43,60,0.16)] outline-none transition hover:border-[#c8d6e4] focus-visible:ring-3 focus-visible:ring-[#1b6ca8]/30"
    >
      <div className="relative aspect-4/3 bg-[#f7f9fb]">{children}</div>
      <div className="border-t border-[#eef2f6] px-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[14px] font-medium tracking-[-0.01em] text-[#1a2b3c]">
            {title}
          </p>
          <span className="text-[12px] text-[#8a9aab] transition group-hover:text-[#1b6ca8]">
            Open →
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-5 text-[#6a7d90]">{line}</p>
      </div>
    </button>
  );
}

function HeartPreview() {
  return (
    <svg
      viewBox="0 0 320 240"
      className="h-full w-full"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={`h-${i}`}
          x1="0"
          y1={i * 32}
          x2="320"
          y2={i * 32}
          stroke="rgba(27,108,168,0.06)"
        />
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <line
          key={`v-${i}`}
          x1={i * 32}
          y1="0"
          x2={i * 32}
          y2="240"
          stroke="rgba(27,108,168,0.06)"
        />
      ))}

      {/* Soft glow */}
      <ellipse
        cx="160"
        cy="128"
        rx="78"
        ry="70"
        fill="rgba(27,108,168,0.06)"
      />

      {/* Vessels */}
      <path
        d="M148 58 C 148 42, 160 36, 168 48"
        fill="none"
        stroke="#1b6ca8"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M172 58 C 178 40, 192 38, 196 52"
        fill="none"
        stroke="#5a8eb8"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Heart body — animated pulse */}
      <g className="origin-center animate-soft-pulse" style={{ transformOrigin: "160px 130px" }}>
        <path
          d="M160 188
             C 118 168, 96 142, 96 116
             C 96 92, 114 78, 136 78
             C 148 78, 156 84, 160 94
             C 164 84, 172 78, 184 78
             C 206 78, 224 92, 224 116
             C 224 142, 202 168, 160 188 Z"
          fill="#1b6ca8"
        />
        <path
          d="M160 100 L160 176"
          stroke="#d4e8f6"
          strokeWidth="1.5"
          opacity="0.55"
        />
        <path
          d="M118 120 C 140 116, 180 116, 202 120"
          stroke="#d4e8f6"
          strokeWidth="1.5"
          opacity="0.45"
          fill="none"
        />
      </g>

      <g>
        <circle cx="108" cy="168" r="3" fill="#0f4f7c" opacity="0.5">
          <animate
            attributeName="cy"
            values="168;156;168"
            dur="1.4s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.5;0.15;0.5"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="212" cy="160" r="3" fill="#c24545" opacity="0.55">
          <animate
            attributeName="cy"
            values="160;148;160"
            dur="1.4s"
            begin="0.35s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.55;0.15;0.55"
            dur="1.4s"
            begin="0.35s"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      <text
        x="160"
        y="220"
        textAnchor="middle"
        fontSize="10"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fill="#8a9aab"
      >
        3D · cardiopulmonary
      </text>
    </svg>
  );
}

function EyePreview() {
  return (
    <svg
      viewBox="0 0 320 240"
      className="h-full w-full"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <line
          key={`h-${i}`}
          x1="0"
          y1={i * 32}
          x2="320"
          y2={i * 32}
          stroke="rgba(27,108,168,0.06)"
        />
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <line
          key={`v-${i}`}
          x1={i * 32}
          y1="0"
          x2={i * 32}
          y2="240"
          stroke="rgba(27,108,168,0.06)"
        />
      ))}

      <ellipse
        cx="160"
        cy="120"
        rx="88"
        ry="70"
        fill="rgba(27,108,168,0.05)"
      />

      {/* Light rays */}
      <g stroke="#1b6ca8" strokeWidth="1.4" strokeLinecap="round" opacity="0.55">
        <line x1="36" y1="72" x2="108" y2="108">
          <animate
            attributeName="opacity"
            values="0.25;0.7;0.25"
            dur="2.4s"
            repeatCount="indefinite"
          />
        </line>
        <line x1="36" y1="120" x2="108" y2="120">
          <animate
            attributeName="opacity"
            values="0.25;0.7;0.25"
            dur="2.4s"
            begin="0.2s"
            repeatCount="indefinite"
          />
        </line>
        <line x1="36" y1="168" x2="108" y2="132">
          <animate
            attributeName="opacity"
            values="0.25;0.7;0.25"
            dur="2.4s"
            begin="0.4s"
            repeatCount="indefinite"
          />
        </line>
      </g>

      {/* Sclera / globe */}
      <ellipse
        cx="168"
        cy="120"
        rx="72"
        ry="58"
        fill="#ffffff"
        stroke="#c8d6e4"
        strokeWidth="2"
      />

      {/* Iris */}
      <circle cx="156" cy="120" r="28" fill="#1b6ca8" />
      <circle cx="156" cy="120" r="18" fill="#0f4f7c" />
      {/* Pupil */}
      <circle cx="156" cy="120" r="9" fill="#1a2b3c">
        <animate
          attributeName="r"
          values="9;7;9"
          dur="3.2s"
          repeatCount="indefinite"
        />
      </circle>
      {/* Highlight */}
      <circle cx="148" cy="112" r="4" fill="#ffffff" opacity="0.85" />

      {/* Lens hint */}
      <ellipse
        cx="176"
        cy="120"
        rx="8"
        ry="16"
        fill="none"
        stroke="#7eb6d9"
        strokeWidth="1.5"
        opacity="0.8"
      />

      {/* Retina arc + optic nerve */}
      <path
        d="M230 92 C 244 120, 244 120, 230 148"
        fill="none"
        stroke="#0f4f7c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M236 120 L278 128"
        fill="none"
        stroke="#1b6ca8"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <text
        x="160"
        y="220"
        textAnchor="middle"
        fontSize="10"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fill="#8a9aab"
      >
        3D · light path
      </text>
    </svg>
  );
}
