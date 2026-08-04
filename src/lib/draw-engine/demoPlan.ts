import type { DrawCommand } from "@/lib/draw-engine/commands";
import {
  DRAW_CANVAS_HEIGHT,
  DRAW_CANVAS_WIDTH,
} from "@/lib/draw-engine/commands";

/**
 * Mock "AI planner" output: timed typed commands (not pixels).
 * Simulates: speak → draw parts → pause → arrow → label.
 */
export function buildDemoCommandPlan(prompt: string): {
  title: string;
  commands: DrawCommand[];
  speaks: Array<{ text: string; t0: number }>;
} {
  const topic = prompt.trim() || "photosynthesis";
  const title = `Drawing: ${topic.slice(0, 48)}`;

  const commands: DrawCommand[] = [
    {
      id: "sun",
      type: "circle",
      t0: 400,
      durationMs: 700,
      x: 160,
      y: 140,
      radius: 48,
      color: "#b86a1e",
      width: 3,
      fill: "rgba(245, 199, 110, 0.35)",
    },
    {
      id: "sun-rays",
      type: "stroke",
      t0: 900,
      durationMs: 900,
      color: "#b86a1e",
      width: 2.5,
      jitter: 1.1,
      points: [
        { x: 210, y: 140 },
        { x: 270, y: 120 },
        { x: 210, y: 160 },
        { x: 275, y: 175 },
        { x: 205, y: 175 },
        { x: 260, y: 210 },
      ],
    },
    {
      id: "pause-1",
      type: "pause",
      t0: 1800,
      durationMs: 350,
    },
    {
      id: "leaf",
      type: "stroke",
      t0: 2200,
      durationMs: 1400,
      color: "#2a7a5c",
      width: 3.5,
      closed: true,
      jitter: 1.2,
      points: [
        { x: 420, y: 320 },
        { x: 520, y: 240 },
        { x: 650, y: 280 },
        { x: 700, y: 360 },
        { x: 620, y: 430 },
        { x: 500, y: 420 },
        { x: 420, y: 320 },
      ],
    },
    {
      id: "vein",
      type: "stroke",
      t0: 3400,
      durationMs: 800,
      color: "#1a5c40",
      width: 2,
      jitter: 0.7,
      points: [
        { x: 450, y: 330 },
        { x: 540, y: 310 },
        { x: 620, y: 350 },
        { x: 680, y: 370 },
      ],
    },
    {
      id: "arrow-energy",
      type: "arrow",
      t0: 4300,
      durationMs: 700,
      x1: 230,
      y1: 190,
      x2: 400,
      y2: 290,
      color: "#1b6ca8",
      width: 3,
    },
    {
      id: "label-sun",
      type: "text",
      t0: 4800,
      durationMs: 500,
      text: "Sunlight",
      x: 120,
      y: 210,
      color: "#1a2b3c",
      fontSize: 22,
    },
    {
      id: "label-leaf",
      type: "text",
      t0: 5200,
      durationMs: 500,
      text: "Leaf",
      x: 540,
      y: 455,
      color: "#1a2b3c",
      fontSize: 22,
    },
    {
      id: "hl",
      type: "highlight",
      t0: 5600,
      durationMs: 600,
      x: 100,
      y: 80,
      w: 180,
      h: 160,
      color: "#f5d76e",
    },
    {
      id: "box-note",
      type: "rect",
      t0: 6200,
      durationMs: 700,
      x: 80,
      y: 500,
      w: 740,
      h: 60,
      color: "#1a2b3c",
      width: 2,
      fill: "rgba(27, 108, 168, 0.06)",
    },
    {
      id: "summary",
      type: "text",
      t0: 6800,
      durationMs: 600,
      text: `${topic}: light energy → chemical energy`,
      x: 100,
      y: 518,
      color: "#1a2b3c",
      fontSize: 20,
    },
  ];

  const speaks = [
    { text: `Let's sketch ${topic}.`, t0: 0 },
    { text: "Here is the sun — our energy source.", t0: 400 },
    { text: "And a leaf that captures that light.", t0: 2200 },
    { text: "Energy flows from the sun into the leaf.", t0: 4300 },
    { text: "That's the core idea in one picture.", t0: 6200 },
  ];

  // Ensure canvas constants stay authoritative for planners.
  void DRAW_CANVAS_WIDTH;
  void DRAW_CANVAS_HEIGHT;

  return { title, commands, speaks };
}
