"use client";

import { useEffect, useId, useRef } from "react";
import rough from "roughjs";
import {
  polygonName,
  type SceneRecipe,
} from "@/lib/schemas/sceneRecipe";

const STROKE = "#7dcea0";
const MUTED = "#8fa398";
const INK = "#dfe8e3";
const WARM = "#e5c07b";
const MONO = "var(--font-ibm-plex-mono), monospace";

type RoughSketchProps = {
  recipe: SceneRecipe;
};

export function RoughSketch({ recipe }: RoughSketchProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const reactId = useId();
  const key = JSON.stringify(recipe);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const rc = rough.svg(svg);
    const opts = {
      roughness: 1.35,
      bowing: 1.1,
      strokeWidth: 2.2,
      seed: hashSeed(key),
    };

    const append = (node: SVGGElement | SVGElement) => {
      svg.appendChild(node);
    };

    const text = (
      x: number,
      y: number,
      value: string,
      size = 13,
      fill = INK,
      anchor: "start" | "middle" | "end" = "middle",
    ) => {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
      el.setAttribute("x", String(x));
      el.setAttribute("y", String(y));
      el.setAttribute("fill", fill);
      el.setAttribute("font-family", MONO);
      el.setAttribute("font-size", String(size));
      el.setAttribute("text-anchor", anchor);
      el.textContent = value;
      svg.appendChild(el);
    };

    switch (recipe.kind) {
      case "polygon": {
        const pts = regularPolygon(210, 118, recipe.sides <= 4 ? 78 : 86, recipe.sides);
        append(
          rc.polygon(pts, {
            ...opts,
            stroke: STROKE,
            fill: "rgba(125,206,160,0.06)",
            fillStyle: "solid",
          }),
        );
        text(210, 230, recipe.label || polygonName(recipe.sides), 14);
        text(
          210,
          252,
          recipe.note ?? `${recipe.sides} sides`,
          11,
          MUTED,
        );
        break;
      }
      case "circle": {
        append(
          rc.circle(210, 118, 156, {
            ...opts,
            stroke: STROKE,
            fill: "rgba(125,206,160,0.05)",
            fillStyle: "solid",
          }),
        );
        if (recipe.showRadius !== false) {
          append(
            rc.line(210, 118, 288, 118, {
              ...opts,
              stroke: WARM,
              strokeWidth: 1.8,
            }),
          );
          append(
            rc.circle(210, 118, 7, {
              ...opts,
              stroke: WARM,
              fill: WARM,
              fillStyle: "solid",
            }),
          );
          text(248, 110, "r", 12, WARM, "start");
        }
        text(210, 230, recipe.label || "circle", 14);
        text(210, 252, "all points equal distance from center", 11, MUTED);
        break;
      }
      case "line": {
        append(
          rc.line(70, 130, 350, 130, { ...opts, stroke: STROKE, strokeWidth: 2.6 }),
        );
        append(
          rc.circle(70, 130, 10, {
            ...opts,
            stroke: WARM,
            fill: WARM,
            fillStyle: "solid",
          }),
        );
        append(
          rc.circle(350, 130, 10, {
            ...opts,
            stroke: WARM,
            fill: WARM,
            fillStyle: "solid",
          }),
        );
        text(70, 116, "A", 12, WARM);
        text(350, 116, "B", 12, WARM);
        text(210, 200, recipe.label || "line", 14);
        break;
      }
      case "stack": {
        const layers = recipe.layers?.length
          ? recipe.layers.slice(-4)
          : ["bottom", "mid", "top"];
        layers.forEach((layer, i) => {
          const y = 190 - i * 42;
          const top = i === layers.length - 1;
          append(
            rc.rectangle(140, y, 140, 34, {
              ...opts,
              stroke: top ? STROKE : MUTED,
              strokeWidth: top ? 2.5 : 2,
            }),
          );
          text(210, y + 22, layer, 11, top ? STROKE : MUTED);
        });
        text(210, 248, recipe.label || "stack", 13, MUTED);
        break;
      }
      case "cycle": {
        append(
          rc.circle(210, 120, 140, {
            ...opts,
            stroke: MUTED,
            strokeLineDash: [8, 6],
          }),
        );
        // rough arc approximation via path
        const arc = document.createElementNS("http://www.w3.org/2000/svg", "path");
        arc.setAttribute(
          "d",
          "M210 50 A70 70 0 1 1 145 165",
        );
        arc.setAttribute("fill", "none");
        arc.setAttribute("stroke", STROKE);
        arc.setAttribute("stroke-width", "3");
        arc.setAttribute("stroke-linecap", "round");
        svg.appendChild(arc);
        const tip = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        tip.setAttribute("points", "138,158 152,164 142,176");
        tip.setAttribute("fill", STROKE);
        svg.appendChild(tip);
        text(210, 124, "repeat", 14);
        text(210, 230, recipe.label || "loop", 12, MUTED);
        break;
      }
      case "tree": {
        append(rc.circle(210, 58, 44, { ...opts, stroke: STROKE }));
        text(210, 62, "root", 11, STROKE);
        append(rc.line(210, 80, 140, 125, { ...opts, stroke: MUTED }));
        append(rc.line(210, 80, 280, 125, { ...opts, stroke: MUTED }));
        append(rc.circle(140, 148, 40, { ...opts, stroke: MUTED }));
        append(rc.circle(280, 148, 40, { ...opts, stroke: MUTED }));
        append(rc.line(140, 168, 110, 205, { ...opts, stroke: MUTED }));
        append(rc.line(140, 168, 170, 205, { ...opts, stroke: MUTED }));
        append(rc.circle(110, 222, 30, { ...opts, stroke: MUTED, strokeWidth: 1.8 }));
        append(rc.circle(170, 222, 30, { ...opts, stroke: MUTED, strokeWidth: 1.8 }));
        text(210, 268, recipe.label || "tree", 12, MUTED);
        break;
      }
      case "metaphor": {
        if (recipe.template === "classroom") {
          append(
            rc.rectangle(24, 28, 372, 224, {
              ...opts,
              stroke: MUTED,
              fill: "rgba(31,42,37,0.5)",
              fillStyle: "solid",
            }),
          );
          append(
            rc.rectangle(48, 52, 200, 120, {
              ...opts,
              stroke: "#c5d4cb",
              strokeLineDash: [6, 4],
            }),
          );
          text(148, 118, "classroom", 14);
          append(
            rc.rectangle(280, 64, 88, 56, { ...opts, stroke: STROKE }),
          );
          text(324, 98, recipe.label || "Car", 13, STROKE);
          append(rc.line(248, 92, 280, 92, { ...opts, stroke: STROKE }));
          const arrow = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "polygon",
          );
          arrow.setAttribute("points", "274,86 286,92 274,98");
          arrow.setAttribute("fill", STROKE);
          svg.appendChild(arrow);
          append(rc.rectangle(72, 196, 48, 28, { ...opts, stroke: MUTED, strokeWidth: 1.8 }));
          append(rc.rectangle(136, 196, 48, 28, { ...opts, stroke: MUTED, strokeWidth: 1.8 }));
          append(rc.rectangle(200, 196, 48, 28, { ...opts, stroke: MUTED, strokeWidth: 1.8 }));
          text(210, 248, "related things live inside", 11, MUTED);
        } else {
          // conveyor / process strip
          append(
            rc.rectangle(50, 100, 320, 50, { ...opts, stroke: MUTED }),
          );
          for (const x of [90, 160, 230, 300]) {
            append(
              rc.circle(x, 125, 16, { ...opts, stroke: STROKE, strokeWidth: 1.8 }),
            );
          }
          text(210, 200, recipe.label || "process", 14);
          text(210, 230, "steps in order", 11, MUTED);
        }
        break;
      }
      case "concept":
      default: {
        append(
          rc.rectangle(48, 40, 324, 180, {
            ...opts,
            stroke: MUTED,
            strokeLineDash: [7, 5],
          }),
        );
        append(
          rc.circle(210, 110, 72, {
            ...opts,
            stroke: STROKE,
          }),
        );
        text(210, 116, "idea", 13, STROKE);
        text(210, 175, truncate(recipe.label, 28), 15);
        text(210, 248, recipe.note ?? "sketch of the idea", 11, MUTED);
        break;
      }
    }
  }, [key, recipe, reactId]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 420 280"
      className="h-[min(52vh,360px)] w-full max-w-[520px] animate-sketch-in"
      role="img"
      aria-label={`Teaching sketch: ${recipe.label}`}
    />
  );
}

function regularPolygon(
  cx: number,
  cy: number,
  radius: number,
  sides: number,
): [number, number][] {
  const pts: [number, number][] = [];
  const start = -Math.PI / 2;
  for (let i = 0; i < sides; i++) {
    const a = start + (i * 2 * Math.PI) / sides;
    pts.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
  }
  return pts;
}

function hashSeed(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 10_000;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
