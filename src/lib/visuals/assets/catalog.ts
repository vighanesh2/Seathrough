import type { VisualAsset } from "@/lib/visuals/types";
import { METAPHOR_ASSETS } from "@/lib/visuals/assets/metaphorAssets";
import { GENERATED_ASSETS } from "@/lib/visuals/assets/generated";
import { EXTERNAL_DIAGRAM_ASSETS } from "@/lib/visuals/assets/externalDiagrams";


/** Side-view airplane with force / part anchors (physics / lift lessons). */
export const airplaneSideView: VisualAsset = {
  id: "airplane-side-view",
  title: "Airplane (side view)",
  viewBox: "0 0 480 280",
  tags: ["airplane", "aeroplane", "plane", "flight", "lift", "aerodynamics", "wing"],
  paths: [
    {
      id: "fuselage",
      d: "M70 150 C120 130, 200 125, 300 135 C340 140, 380 150, 410 160 L400 175 C360 165, 300 160, 220 158 C150 156, 100 165, 70 175 Z",
      drawOrder: 1,
      stroke: "#7dcea0",
      strokeWidth: 2.5,
    },
    {
      id: "wing",
      d: "M180 148 L120 95 L260 140 L180 148 Z",
      drawOrder: 2,
      stroke: "#7dcea0",
      strokeWidth: 2.2,
    },
    {
      id: "tail",
      d: "M390 155 L430 110 L415 165 Z",
      drawOrder: 3,
      stroke: "#7dcea0",
      strokeWidth: 2.2,
    },
    {
      id: "nose",
      d: "M70 150 C55 155, 55 170, 70 175",
      drawOrder: 4,
      stroke: "#e5c07b",
      strokeWidth: 2,
    },
  ],
  anchors: {
    leftWing: { x: 140, y: 110, preferredLabelSide: "top" },
    wing: { x: 180, y: 130, preferredLabelSide: "top" },
    wingBottom: { x: 190, y: 155, preferredLabelSide: "bottom" },
    nose: { x: 60, y: 160, preferredLabelSide: "left" },
    tail: { x: 425, y: 125, preferredLabelSide: "right" },
    engine: { x: 210, y: 165, preferredLabelSide: "bottom" },
    liftArrowStart: { x: 200, y: 100, preferredLabelSide: "top" },
    weightArrowStart: { x: 220, y: 190, preferredLabelSide: "bottom" },
    thrustArrowStart: { x: 90, y: 160, preferredLabelSide: "left" },
    dragArrowStart: { x: 350, y: 145, preferredLabelSide: "right" },
  },
};

export const horseRider: VisualAsset = {
  id: "horse-rider",
  title: "Horse & rider",
  viewBox: "0 0 480 280",
  tags: ["horse", "horseriding", "horse riding", "equestrian", "saddle"],
  paths: [
    {
      id: "body",
      d: "M140 160 C180 120, 280 115, 340 145 C360 155, 350 190, 310 195 L180 200 C150 198, 130 180, 140 160 Z",
      drawOrder: 1,
      stroke: "#7dcea0",
      strokeWidth: 2.5,
    },
    {
      id: "neck-head",
      d: "M140 160 C110 130, 95 100, 115 85 C130 75, 145 95, 150 120",
      drawOrder: 2,
      stroke: "#7dcea0",
      strokeWidth: 2.3,
    },
    {
      id: "legs",
      d: "M175 195 L165 250 M210 198 L205 252 M280 195 L290 250 M315 192 L330 248",
      drawOrder: 3,
      stroke: "#8fa398",
      strokeWidth: 2.2,
    },
    {
      id: "saddle",
      d: "M200 145 C230 135, 270 135, 295 150 L290 170 C260 160, 230 160, 205 168 Z",
      drawOrder: 4,
      stroke: "#e5c07b",
      strokeWidth: 2.2,
    },
    {
      id: "rider",
      d: "M235 95 C245 85, 260 90, 258 105 L250 145 M250 110 L230 140 M250 110 L275 140",
      drawOrder: 5,
      stroke: "#7dcea0",
      strokeWidth: 2,
    },
  ],
  anchors: {
    horse: { x: 240, y: 165, preferredLabelSide: "bottom" },
    head: { x: 110, y: 95, preferredLabelSide: "left" },
    saddle: { x: 245, y: 150, preferredLabelSide: "top" },
    rider: { x: 250, y: 100, preferredLabelSide: "top" },
    balance: { x: 250, y: 125, preferredLabelSide: "right" },
    reins: { x: 180, y: 120, preferredLabelSide: "top" },
  },
};

export const classroomBlueprint: VisualAsset = {
  id: "classroom-blueprint",
  title: "Classroom layout",
  viewBox: "0 0 480 280",
  // Literal classroom only — OOP "class" uses class-blueprint via metaphor map
  tags: ["classroom", "school classroom", "classroom layout"],
  paths: [
    {
      id: "room",
      d: "M40 40 H300 V220 H40 Z",
      drawOrder: 1,
      stroke: "#8fa398",
      strokeWidth: 2.4,
    },
    {
      id: "object-box",
      d: "M330 70 H440 V150 H330 Z",
      drawOrder: 2,
      stroke: "#7dcea0",
      strokeWidth: 2.4,
    },
    {
      id: "link",
      d: "M300 110 H330",
      drawOrder: 3,
      stroke: "#7dcea0",
      strokeWidth: 2.2,
    },
    {
      id: "desks",
      d: "M70 180 H120 V210 H70 Z M145 180 H195 V210 H145 Z M220 180 H270 V210 H220 Z",
      drawOrder: 4,
      stroke: "#a8b8af",
      strokeWidth: 1.8,
    },
  ],
  anchors: {
    classroom: { x: 170, y: 120, preferredLabelSide: "top" },
    object: { x: 385, y: 110, preferredLabelSide: "right" },
    door: { x: 40, y: 130, preferredLabelSide: "left" },
    desks: { x: 170, y: 195, preferredLabelSide: "bottom" },
  },
};

export const hexagonShape: VisualAsset = {
  id: "hexagon-shape",
  title: "Hexagon",
  viewBox: "0 0 480 280",
  tags: ["hexagon", "polygon", "geometry", "six-sides"],
  paths: [
    {
      id: "hexagon",
      d: "M240 50 L330 100 L330 180 L240 230 L150 180 L150 100 Z",
      drawOrder: 1,
      stroke: "#7dcea0",
      strokeWidth: 2.8,
    },
  ],
  anchors: {
    center: { x: 240, y: 140, preferredLabelSide: "bottom" },
    top: { x: 240, y: 50, preferredLabelSide: "top" },
    side: { x: 330, y: 140, preferredLabelSide: "right" },
  },
};

export const heartOrgan: VisualAsset = {
  id: "heart-simple",
  title: "Heart",
  viewBox: "0 0 480 280",
  tags: ["heart", "biology", "organ", "love"],
  paths: [
    {
      id: "heart",
      d: "M240 220 C140 160, 120 90, 180 70 C210 60, 230 80, 240 100 C250 80, 270 60, 300 70 C360 90, 340 160, 240 220 Z",
      drawOrder: 1,
      stroke: "#e06c60",
      strokeWidth: 2.6,
    },
  ],
  anchors: {
    center: { x: 240, y: 140, preferredLabelSide: "right" },
    left: { x: 180, y: 100, preferredLabelSide: "left" },
    right: { x: 300, y: 100, preferredLabelSide: "right" },
    tip: { x: 240, y: 220, preferredLabelSide: "bottom" },
  },
};

export const stackPlates: VisualAsset = {
  id: "stack-plates",
  title: "Stack",
  viewBox: "0 0 480 280",
  tags: ["stack", "lifo", "call-stack", "data-structure"],
  paths: [
    {
      id: "bottom",
      d: "M170 200 H310 V236 H170 Z",
      drawOrder: 1,
      stroke: "#8fa398",
      strokeWidth: 2,
    },
    {
      id: "mid",
      d: "M170 155 H310 V191 H170 Z",
      drawOrder: 2,
      stroke: "#8fa398",
      strokeWidth: 2,
    },
    {
      id: "top",
      d: "M170 110 H310 V146 H170 Z",
      drawOrder: 3,
      stroke: "#7dcea0",
      strokeWidth: 2.5,
    },
  ],
  anchors: {
    top: { x: 240, y: 128, preferredLabelSide: "top" },
    mid: { x: 240, y: 173, preferredLabelSide: "right" },
    bottom: { x: 240, y: 218, preferredLabelSide: "bottom" },
  },
};

export const loopCycle: VisualAsset = {
  id: "loop-cycle",
  title: "Loop / cycle",
  viewBox: "0 0 480 280",
  tags: ["for-loop", "while-loop", "for loop", "while loop", "iteration", "programming loop", "repeat"],
  paths: [
    {
      id: "ring",
      d: "M240 60 A80 80 0 1 1 239 60",
      drawOrder: 1,
      stroke: "#7dcea0",
      strokeWidth: 2.8,
    },
    {
      id: "arrow-head",
      d: "M300 75 L320 95 L295 100 Z",
      drawOrder: 2,
      stroke: "#7dcea0",
      strokeWidth: 2,
      fill: "#7dcea0",
    },
  ],
  anchors: {
    center: { x: 240, y: 140, preferredLabelSide: "bottom" },
    start: { x: 240, y: 60, preferredLabelSide: "top" },
  },
};

export const rightTriangle: VisualAsset = {
  id: "right-triangle",
  title: "Right triangle",
  viewBox: "0 0 480 280",
  // Only match when the user asks for a right triangle — not theorem topics.
  tags: ["right triangle", "right-angled", "right angled triangle"],
  paths: [
    {
      id: "triangle",
      d: "M90 220 L90 70 L340 220 Z",
      drawOrder: 1,
      stroke: "#7dcea0",
      strokeWidth: 2.8,
    },
    {
      id: "right-angle",
      d: "M90 190 L120 190 L120 220",
      drawOrder: 2,
      stroke: "#e5c07b",
      strokeWidth: 2,
    },
  ],
  anchors: {
    a: { x: 70, y: 145, preferredLabelSide: "left" },
    b: { x: 210, y: 240, preferredLabelSide: "bottom" },
    c: { x: 230, y: 130, preferredLabelSide: "top" },
    rightAngle: { x: 110, y: 205, preferredLabelSide: "right" },
    formula: { x: 320, y: 80, preferredLabelSide: "right" },
  },
};

export const VISUAL_ASSETS: VisualAsset[] = [
  airplaneSideView,
  horseRider,
  classroomBlueprint,
  hexagonShape,
  heartOrgan,
  stackPlates,
  loopCycle,
  rightTriangle,
  ...METAPHOR_ASSETS,
  ...GENERATED_ASSETS,
  ...EXTERNAL_DIAGRAM_ASSETS,
];

export function getVisualAsset(id: string): VisualAsset | undefined {
  return VISUAL_ASSETS.find((a) => a.id === id);
}
