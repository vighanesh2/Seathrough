"use client";

import { useEffect, useRef, useState } from "react";
import { getVisualAsset } from "@/lib/visuals/assets/catalog";
import type { VisualAction, VisualPlan } from "@/lib/visuals/types";
import { cn } from "@/lib/utils";

type TemplateStageProps = {
  plan: VisualPlan | null;
  playKey: number;
  onDrawComplete?: () => void;
  className?: string;
};

type LabelMark = { id: string; x: number; y: number; text: string };
type ArrowMark = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
};

/**
 * Curated SVG templates — always paint strokes immediately.
 * No stroke-dash hide/reveal (that was leaving the board blank).
 */
export function TemplateStage({
  plan,
  playKey,
  onDrawComplete,
  className,
}: TemplateStageProps) {
  const onDoneRef = useRef(onDrawComplete);
  useEffect(() => {
    onDoneRef.current = onDrawComplete;
  }, [onDrawComplete]);

  const [labels, setLabels] = useState<LabelMark[]>([]);
  const [arrows, setArrows] = useState<ArrowMark[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);

  const asset = plan?.assetId ? getVisualAsset(plan.assetId) : undefined;

  useEffect(() => {
    if (!plan || plan.renderer !== "template" || !asset) return;

    const actions = ensureDraw(plan.actions);
    const nextLabels: LabelMark[] = [];
    const nextArrows: ArrowMark[] = [];
    let hl: string | null = null;

    for (const action of actions) {
      if (action.type === "label") {
        const anchor = asset.anchors[action.anchor];
        if (!anchor) continue;
        const offset = labelOffset(anchor.preferredLabelSide);
        nextLabels.push({
          id: action.anchor,
          x: anchor.x + offset.x,
          y: anchor.y + offset.y,
          text: action.text,
        });
      }
      if (action.type === "arrow") {
        const from = asset.anchors[action.fromAnchor];
        if (!from) continue;
        const to = action.toAnchor
          ? asset.anchors[action.toAnchor]
          : directionPoint(from, action.direction ?? "down");
        if (!to) continue;
        nextArrows.push({
          id: `${action.fromAnchor}-${action.label ?? "arrow"}`,
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
          label: action.label,
        });
      }
      if (action.type === "highlight") hl = action.anchor;
      if (action.type === "write") {
        nextLabels.push({
          id: `write-${action.text}`,
          x: action.x ?? 40,
          y: action.y ?? 250,
          text: action.text,
        });
      }
    }

    // Resetting the staged overlay is the purpose of this playback effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlight(hl);
    // Stagger labels slightly so the figure reads first
    setLabels([]);
    setArrows([]);
    const t = window.setTimeout(() => {
      setLabels(nextLabels);
      setArrows(nextArrows);
      onDoneRef.current?.();
    }, 280);

    return () => window.clearTimeout(t);
  }, [plan, playKey, asset]);

  if (!asset) {
    return (
      <div className="flex h-full items-center justify-center font-sans text-sm text-muted">
        No drawing matched ({plan?.assetId ?? "missing id"})
      </div>
    );
  }

  const hl = highlight ? asset.anchors[highlight] : null;

  return (
    <svg
      viewBox={asset.viewBox}
      className={cn(
        "h-[min(55vh,400px)] w-full max-w-[560px] animate-sketch-in",
        className,
      )}
      role="img"
      aria-label={asset.title}
    >
      {hl ? (
        <circle
          cx={hl.x}
          cy={hl.y}
          r={28}
          fill="rgba(27,108,168,0.12)"
          stroke="#1b6ca8"
          strokeWidth={1.5}
        />
      ) : null}

      {asset.paths.map((p) => (
        <path
          key={`${playKey}-${p.id}`}
          d={p.d}
          fill={p.fill ?? "none"}
          stroke={p.stroke ?? "#1b6ca8"}
          strokeWidth={p.strokeWidth ?? 2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {arrows.map((a) => (
        <g key={a.id}>
          <line
            x1={a.x1}
            y1={a.y1}
            x2={a.x2}
            y2={a.y2}
            stroke="#e5c07b"
            strokeWidth={2}
            markerEnd="url(#arrowHead)"
          />
          {a.label ? (
            <text
              x={(a.x1 + a.x2) / 2}
              y={(a.y1 + a.y2) / 2 - 8}
              fill="#e5c07b"
              fontSize={12}
              fontFamily="var(--font-ibm-plex-mono), monospace"
              textAnchor="middle"
            >
              {a.label}
            </text>
          ) : null}
        </g>
      ))}

      {labels.map((l) => (
        <text
          key={l.id}
          x={l.x}
          y={l.y}
          fill="#dfe8e3"
          fontSize={14}
          fontFamily="var(--font-ibm-plex-mono), monospace"
        >
          {l.text}
        </text>
      ))}

      <defs>
        <marker
          id="arrowHead"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="#e5c07b" />
        </marker>
      </defs>
    </svg>
  );
}

function ensureDraw(actions: VisualAction[]): VisualAction[] {
  const list = actions.length ? actions : [];
  if (list.some((a) => a.type === "draw")) return list;
  return [{ type: "draw" }, ...list];
}

function labelOffset(side: string): { x: number; y: number } {
  switch (side) {
    case "top":
      return { x: -20, y: -14 };
    case "bottom":
      return { x: -20, y: 22 };
    case "left":
      return { x: -70, y: 4 };
    default:
      return { x: 16, y: 4 };
  }
}

function directionPoint(
  from: { x: number; y: number },
  direction: "up" | "down" | "left" | "right",
) {
  const dist = 50;
  switch (direction) {
    case "up":
      return { x: from.x, y: from.y - dist };
    case "down":
      return { x: from.x, y: from.y + dist };
    case "left":
      return { x: from.x - dist, y: from.y };
    case "right":
      return { x: from.x + dist, y: from.y };
  }
}
