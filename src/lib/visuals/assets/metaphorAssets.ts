import type { VisualAsset } from "@/lib/visuals/types";

/**
 * Class = blueprint/template; instances are built from it.
 * Replaces the misleading classroom metaphor for OOP "class".
 */
export const classBlueprint: VisualAsset = {
  id: "class-blueprint",
  title: "Class blueprint → objects",
  viewBox: "0 0 480 280",
  tags: [
    "java class",
    "class in java",
    "oop class",
    "class vs object",
    "blueprint",
    "template",
    "class",
  ],
  paths: [
    {
      id: "blueprint-frame",
      d: "M40 40 H220 V200 H40 Z",
      drawOrder: 1,
      stroke: "#8fa398",
      strokeWidth: 2.2,
    },
    {
      id: "blueprint-grid",
      d: "M60 70 H200 M60 100 H200 M60 130 H200 M60 160 H160",
      drawOrder: 2,
      stroke: "#5f7368",
      strokeWidth: 1.4,
    },
    {
      id: "arrow-spawn",
      d: "M230 120 H270",
      drawOrder: 3,
      stroke: "#e5c07b",
      strokeWidth: 2.4,
    },
    {
      id: "instance-a",
      d: "M290 50 H430 V120 H290 Z",
      drawOrder: 4,
      stroke: "#7dcea0",
      strokeWidth: 2.4,
    },
    {
      id: "instance-b",
      d: "M290 150 H430 V220 H290 Z",
      drawOrder: 5,
      stroke: "#7dcea0",
      strokeWidth: 2.4,
    },
  ],
  anchors: {
    blueprint: { x: 130, y: 30, preferredLabelSide: "top" },
    instanceA: { x: 360, y: 40, preferredLabelSide: "top" },
    instanceB: { x: 360, y: 240, preferredLabelSide: "bottom" },
    arrow: { x: 250, y: 110, preferredLabelSide: "top" },
  },
};

/** Shop-line metaphor for FIFO queue */
export const queueLine: VisualAsset = {
  id: "queue-line",
  title: "Queue (FIFO line)",
  viewBox: "0 0 480 280",
  tags: ["queue", "fifo", "queue data structure"],
  paths: [
    {
      id: "counter",
      d: "M40 90 H100 V190 H40 Z",
      drawOrder: 1,
      stroke: "#e5c07b",
      strokeWidth: 2.4,
    },
    {
      id: "person-1",
      d: "M140 140 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0",
      drawOrder: 2,
      stroke: "#7dcea0",
      strokeWidth: 2.2,
    },
    {
      id: "person-2",
      d: "M230 140 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0",
      drawOrder: 3,
      stroke: "#7dcea0",
      strokeWidth: 2.2,
    },
    {
      id: "person-3",
      d: "M320 140 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0",
      drawOrder: 4,
      stroke: "#8fa398",
      strokeWidth: 2.2,
    },
    {
      id: "person-4",
      d: "M410 140 m-22 0 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0",
      drawOrder: 5,
      stroke: "#8fa398",
      strokeWidth: 2.2,
    },
  ],
  anchors: {
    front: { x: 140, y: 100, preferredLabelSide: "top" },
    rear: { x: 410, y: 100, preferredLabelSide: "top" },
    service: { x: 70, y: 80, preferredLabelSide: "top" },
  },
};

export const variableBox: VisualAsset = {
  id: "variable-box",
  title: "Variable (named box)",
  viewBox: "0 0 480 280",
  tags: ["variable", "variables", "assignment"],
  paths: [
    {
      id: "box",
      d: "M150 90 H330 V190 H150 Z",
      drawOrder: 1,
      stroke: "#7dcea0",
      strokeWidth: 2.6,
    },
    {
      id: "name-tag",
      d: "M170 55 H250",
      drawOrder: 2,
      stroke: "#e5c07b",
      strokeWidth: 2,
    },
  ],
  anchors: {
    name: { x: 210, y: 45, preferredLabelSide: "top" },
    value: { x: 240, y: 150, preferredLabelSide: "bottom" },
  },
};

export const functionMachine: VisualAsset = {
  id: "function-machine",
  title: "Function machine",
  viewBox: "0 0 480 280",
  tags: ["function", "functions", "input output"],
  paths: [
    {
      id: "input",
      d: "M40 120 H120",
      drawOrder: 1,
      stroke: "#e5c07b",
      strokeWidth: 2.4,
    },
    {
      id: "machine",
      d: "M130 70 H300 V210 H130 Z",
      drawOrder: 2,
      stroke: "#7dcea0",
      strokeWidth: 2.6,
    },
    {
      id: "output",
      d: "M310 120 H420",
      drawOrder: 3,
      stroke: "#e5c07b",
      strokeWidth: 2.4,
    },
  ],
  anchors: {
    input: { x: 70, y: 105, preferredLabelSide: "top" },
    machine: { x: 215, y: 55, preferredLabelSide: "top" },
    output: { x: 370, y: 105, preferredLabelSide: "top" },
  },
};

export const binaryBits: VisualAsset = {
  id: "binary-bits",
  title: "Binary bits",
  viewBox: "0 0 480 280",
  tags: ["binary", "bits", "ones and zeros"],
  paths: [
    {
      id: "bit0",
      d: "M60 100 H120 V180 H60 Z",
      drawOrder: 1,
      stroke: "#8fa398",
      strokeWidth: 2.2,
    },
    {
      id: "bit1",
      d: "M150 100 H210 V180 H150 Z",
      drawOrder: 2,
      stroke: "#7dcea0",
      strokeWidth: 2.4,
    },
    {
      id: "bit2",
      d: "M240 100 H300 V180 H240 Z",
      drawOrder: 3,
      stroke: "#8fa398",
      strokeWidth: 2.2,
    },
    {
      id: "bit3",
      d: "M330 100 H390 V180 H330 Z",
      drawOrder: 4,
      stroke: "#7dcea0",
      strokeWidth: 2.4,
    },
  ],
  anchors: {
    b0: { x: 90, y: 90, preferredLabelSide: "top" },
    b1: { x: 180, y: 90, preferredLabelSide: "top" },
    b2: { x: 270, y: 90, preferredLabelSide: "top" },
    b3: { x: 360, y: 90, preferredLabelSide: "top" },
  },
};

export const inheritanceTree: VisualAsset = {
  id: "inheritance-tree",
  title: "Inheritance (is-a tree)",
  viewBox: "0 0 480 280",
  tags: ["inheritance", "extends", "is-a", "oop inheritance"],
  paths: [
    {
      id: "root",
      d: "M190 40 H290 V90 H190 Z",
      drawOrder: 1,
      stroke: "#7dcea0",
      strokeWidth: 2.4,
    },
    {
      id: "links",
      d: "M240 90 L150 130 M240 90 L330 130",
      drawOrder: 2,
      stroke: "#8fa398",
      strokeWidth: 2,
    },
    {
      id: "child-a",
      d: "M90 140 H200 V200 H90 Z",
      drawOrder: 3,
      stroke: "#7dcea0",
      strokeWidth: 2.2,
    },
    {
      id: "child-b",
      d: "M280 140 H390 V200 H280 Z",
      drawOrder: 4,
      stroke: "#7dcea0",
      strokeWidth: 2.2,
    },
  ],
  anchors: {
    parent: { x: 240, y: 30, preferredLabelSide: "top" },
    childA: { x: 145, y: 220, preferredLabelSide: "bottom" },
    childB: { x: 335, y: 220, preferredLabelSide: "bottom" },
  },
};

export const encryptionLock: VisualAsset = {
  id: "encryption-lock",
  title: "Encryption (lock + key)",
  viewBox: "0 0 480 280",
  tags: ["encryption", "encrypt", "public key"],
  paths: [
    {
      id: "shackle",
      d: "M190 110 C190 70, 290 70, 290 110",
      drawOrder: 1,
      stroke: "#8fa398",
      strokeWidth: 2.4,
    },
    {
      id: "body",
      d: "M170 110 H310 V210 H170 Z",
      drawOrder: 2,
      stroke: "#7dcea0",
      strokeWidth: 2.6,
    },
    {
      id: "key",
      d: "M340 150 H420 M400 150 V180 M410 150 V170",
      drawOrder: 3,
      stroke: "#e5c07b",
      strokeWidth: 2.2,
    },
  ],
  anchors: {
    lock: { x: 240, y: 100, preferredLabelSide: "top" },
    key: { x: 380, y: 135, preferredLabelSide: "top" },
  },
};

export const apiWaiter: VisualAsset = {
  id: "api-waiter",
  title: "API (waiter)",
  viewBox: "0 0 480 280",
  tags: ["api", "rest api", "how apis work"],
  paths: [
    {
      id: "client",
      d: "M40 100 H130 V180 H40 Z",
      drawOrder: 1,
      stroke: "#8fa398",
      strokeWidth: 2.2,
    },
    {
      id: "waiter",
      d: "M200 90 H280 V190 H200 Z",
      drawOrder: 2,
      stroke: "#7dcea0",
      strokeWidth: 2.6,
    },
    {
      id: "kitchen",
      d: "M350 100 H440 V180 H350 Z",
      drawOrder: 3,
      stroke: "#8fa398",
      strokeWidth: 2.2,
    },
    {
      id: "arrows",
      d: "M140 140 H190 M290 140 H340",
      drawOrder: 4,
      stroke: "#e5c07b",
      strokeWidth: 2.2,
    },
  ],
  anchors: {
    client: { x: 85, y: 90, preferredLabelSide: "top" },
    api: { x: 240, y: 80, preferredLabelSide: "top" },
    service: { x: 395, y: 90, preferredLabelSide: "top" },
  },
};

export const pointerArrow: VisualAsset = {
  id: "pointer-arrow",
  title: "Pointer / reference",
  viewBox: "0 0 480 280",
  tags: ["pointer", "reference", "reference vs value"],
  paths: [
    {
      id: "var-box",
      d: "M60 100 H180 V180 H60 Z",
      drawOrder: 1,
      stroke: "#8fa398",
      strokeWidth: 2.2,
    },
    {
      id: "arrow",
      d: "M190 140 H300",
      drawOrder: 2,
      stroke: "#e5c07b",
      strokeWidth: 2.6,
    },
    {
      id: "target",
      d: "M320 90 H440 V190 H320 Z",
      drawOrder: 3,
      stroke: "#7dcea0",
      strokeWidth: 2.6,
    },
  ],
  anchors: {
    variable: { x: 120, y: 90, preferredLabelSide: "top" },
    arrow: { x: 245, y: 125, preferredLabelSide: "top" },
    heap: { x: 380, y: 80, preferredLabelSide: "top" },
  },
};

/** Hand-authored metaphor templates (blackboard stroke style) */
export const METAPHOR_ASSETS: VisualAsset[] = [
  classBlueprint,
  queueLine,
  variableBox,
  functionMachine,
  binaryBits,
  inheritanceTree,
  encryptionLock,
  apiWaiter,
  pointerArrow,
];
