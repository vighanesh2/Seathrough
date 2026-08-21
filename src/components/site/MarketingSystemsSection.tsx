"use client";

import { ArrowRight } from "lucide-react";
import { useStudioAccess } from "@/components/site/StudioAccess";
import { cn } from "@/lib/utils";

const PENDING_PROMPT_KEY = "seethrough.pendingPrompt";
const EXAMPLE =
  "URL shortener with cache, app servers, and a SQL store";

/**
 * Systems section — detailed architecture of a simple URL shortener.
 * Same board-card pattern as math / body.
 */
export function MarketingSystemsSection() {
  const { openStudio } = useStudioAccess();

  function openExample() {
    try {
      sessionStorage.setItem(PENDING_PROMPT_KEY, EXAMPLE);
    } catch {
      /* ignore */
    }
    openStudio("/system-design");
  }

  return (
    <section className="px-5 py-16 md:px-6 md:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="max-w-lg">
          <p className="text-[12px] font-medium tracking-[0.08em] text-[#8a9aab] uppercase">
            Systems
          </p>
          <h2 className="mt-2 text-[1.75rem] leading-tight font-medium tracking-[-0.03em] text-[#1a2b3c] md:text-[2.15rem]">
            Architecture, drawn box by box.
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-[#6a7d90]">
            Describe an app. Services, caches, and databases assemble on the
            board while traffic is explained.
          </p>
        </div>

        <button
          type="button"
          onClick={openExample}
          className="group mt-10 w-full overflow-hidden rounded-2xl border border-[#e6ebf0] bg-white text-left shadow-[0_12px_40px_-24px_rgba(26,43,60,0.16)] outline-none transition hover:border-[#c8d6e4] focus-visible:ring-3 focus-visible:ring-[#1b6ca8]/30"
          aria-label={`Try: ${EXAMPLE}`}
        >
          <div className="flex items-center justify-between border-b border-[#eef2f6] px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="rounded-md bg-[#eef4f9] px-2 py-0.5 font-mono text-[11px] text-[#1b6ca8]">
                Example
              </span>
              <span className="truncate text-[13px] text-[#3d5166]">
                URL shortener
              </span>
            </div>
            <span className="shrink-0 text-[12px] text-[#8a9aab] transition group-hover:text-[#1b6ca8]">
              Open →
            </span>
          </div>

          <div className="relative overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
            <div
              className="board-surface pointer-events-none absolute inset-0 opacity-70"
              aria-hidden
            />
            <div className="relative">
              <UrlShortenerDiagram />
            </div>
          </div>
        </button>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={openExample}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[#1b6ca8] transition hover:text-[#0f4f7c]"
          >
            Design this on the board
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function UrlShortenerDiagram() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 max-w-sm">
        <h3 className="text-[1.2rem] font-semibold tracking-[-0.02em] text-[#1a2b3c]">
          URL shortener
        </h3>
        <p className="mt-1.5 text-[13px] leading-6 text-[#6a7d90]">
          Client → load balancer → app servers, with Redis for hot links and
          Postgres for durable storage.
        </p>
      </div>

      {/* Desktop / tablet flow */}
      <div className="hidden sm:block">
        <svg
          viewBox="0 0 640 300"
          className="h-auto w-full"
          aria-hidden
          role="img"
        >
          <title>URL shortener architecture</title>

          {/* Client */}
          <Node x={24} y={110} w={88} h={56} label="Client" tone="ink" />
          <Arrow x1={112} y1={138} x2={148} y2={138} label="https" />

          {/* LB */}
          <Node
            x={152}
            y={110}
            w={100}
            h={56}
            label="Load balancer"
            tone="blue"
          />
          <Arrow x1={252} y1={138} x2={288} y2={138} />

          {/* App servers stack */}
          <Node x={292} y={72} w={108} h={48} label="App server" tone="blue" />
          <Node
            x={292}
            y={132}
            w={108}
            h={48}
            label="App server"
            tone="blue"
          />
          <text
            x={346}
            y={208}
            textAnchor="middle"
            fontSize="10"
            fill="#8a9aab"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            write / resolve
          </text>

          {/* Split to cache + db */}
          <Arrow x1={400} y1={96} x2={448} y2={72} />
          <Arrow x1={400} y1={156} x2={448} y2={188} />

          <Node x={452} y={44} w={100} h={56} label="Redis cache" tone="copper" />
          <Node
            x={452}
            y={160}
            w={100}
            h={56}
            label="Postgres"
            tone="teal"
          />

          <text
            x={502}
            y={118}
            textAnchor="middle"
            fontSize="10"
            fill="#b86a1e"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            cache hit
          </text>
          <text
            x={502}
            y={240}
            textAnchor="middle"
            fontSize="10"
            fill="#2a7a5c"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            persist slug
          </text>

          {/* Legend */}
          <g transform="translate(24 250)">
            <LegendDot color="#1b6ca8" label="compute" />
            <LegendDot color="#b86a1e" label="cache" x={88} />
            <LegendDot color="#2a7a5c" label="store" x={160} />
          </g>
        </svg>
      </div>

      {/* Mobile stack */}
      <div className="flex flex-col items-center gap-2 sm:hidden">
        {(
          [
            { label: "Client", tone: "ink" as const },
            { label: "Load balancer", tone: "blue" as const },
            { label: "App servers ×2", tone: "blue" as const },
            { label: "Redis cache", tone: "copper" as const },
            { label: "Postgres", tone: "teal" as const },
          ] as const
        ).map((node, i, arr) => (
          <div key={node.label} className="flex w-full max-w-xs flex-col items-center">
            <div
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-center text-[13px] font-medium",
                toneClass(node.tone),
              )}
            >
              {node.label}
            </div>
            {i < arr.length - 1 ? (
              <span className="py-1 text-[12px] text-[#8a9aab]">↓</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function toneClass(tone: "ink" | "blue" | "copper" | "teal") {
  switch (tone) {
    case "blue":
      return "border-[#1b6ca8]/35 bg-[#eef4f9] text-[#0f4f7c]";
    case "copper":
      return "border-[#b86a1e]/35 bg-[#f8e4d0]/70 text-[#8d3f0f]";
    case "teal":
      return "border-[#2a7a5c]/35 bg-[#d5efe4]/70 text-[#2a7a5c]";
    default:
      return "border-[#c8d6e4] bg-white text-[#1a2b3c]";
  }
}

function Node({
  x,
  y,
  w,
  h,
  label,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  tone: "ink" | "blue" | "copper" | "teal";
}) {
  const fill =
    tone === "blue"
      ? "#eef4f9"
      : tone === "copper"
        ? "#f8e4d0"
        : tone === "teal"
          ? "#d5efe4"
          : "#ffffff";
  const stroke =
    tone === "blue"
      ? "#1b6ca8"
      : tone === "copper"
        ? "#b86a1e"
        : tone === "teal"
          ? "#2a7a5c"
          : "#c8d6e4";
  const text =
    tone === "blue"
      ? "#0f4f7c"
      : tone === "copper"
        ? "#8d3f0f"
        : tone === "teal"
          ? "#2a7a5c"
          : "#1a2b3c";

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 4}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill={text}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  label,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
}) {
  const id = `arr-${x1}-${y1}-${x2}-${y2}`;
  return (
    <g>
      <defs>
        <marker
          id={id}
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0 0 L6 3 L0 6 Z" fill="#6a7d90" />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#6a7d90"
        strokeWidth={1.5}
        markerEnd={`url(#${id})`}
      />
      {label ? (
        <text
          x={(x1 + x2) / 2}
          y={y1 - 8}
          textAnchor="middle"
          fontSize={9}
          fill="#8a9aab"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

function LegendDot({
  color,
  label,
  x = 0,
}: {
  color: string;
  label: string;
  x?: number;
}) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect width={8} height={8} rx={2} y={-6} fill={color} />
      <text
        x={14}
        y={1}
        fontSize={10}
        fill="#8a9aab"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}
