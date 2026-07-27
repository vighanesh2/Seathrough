import type { BoardAction } from "@/lib/schemas/boardActions";

/**
 * If the planner omits icon actions, place a relevant Tabler icon
 * so the whiteboard never stays blank for known concepts.
 */
export function fallbackBoardActions(input: {
  prompt: string;
  narration?: string;
  conceptKey?: string;
  highlight?: string;
}): BoardAction[] {
  const blob = [
    input.prompt,
    input.narration,
    input.conceptKey,
    input.highlight,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\bhexagon\b/.test(blob)) {
    return [
      {
        type: "icon",
        id: "hexagon",
        icon: "hexagon",
        x: 170,
        y: 60,
        size: 140,
        animate: true,
      },
      { type: "write", text: "hexagon", x: 190, y: 230 },
      { type: "write", text: "6 sides", x: 200, y: 255 },
    ];
  }

  if (/\bpentagon\b/.test(blob)) {
    return [
      {
        type: "icon",
        id: "pentagon",
        icon: "pentagon",
        x: 170,
        y: 60,
        size: 140,
      },
      { type: "write", text: "pentagon", x: 185, y: 230 },
    ];
  }

  if (/\boctagon\b/.test(blob)) {
    return [
      {
        type: "icon",
        id: "octagon",
        icon: "octagon",
        x: 170,
        y: 60,
        size: 140,
      },
      { type: "write", text: "octagon", x: 190, y: 230 },
    ];
  }

  if (/\b(circle|circular|radius)\b/.test(blob)) {
    return [
      {
        type: "icon",
        id: "circle",
        icon: "circle-dot",
        x: 170,
        y: 50,
        size: 150,
      },
      { type: "write", text: "circle", x: 205, y: 230 },
      { type: "write", text: "radius r", x: 195, y: 255, color: "#e5c07b" },
    ];
  }

  if (/\b(triangle|triangular)\b/.test(blob)) {
    return [
      {
        type: "icon",
        id: "triangle",
        icon: "triangle",
        x: 170,
        y: 55,
        size: 140,
      },
      { type: "write", text: "triangle", x: 185, y: 230 },
    ];
  }

  if (/\b(square|rectangle)\b/.test(blob)) {
    return [
      {
        type: "icon",
        id: "square",
        icon: /\brectangle\b/.test(blob) ? "rectangle" : "square",
        x: 170,
        y: 55,
        size: 140,
      },
      {
        type: "write",
        text: /\brectangle\b/.test(blob) ? "rectangle" : "square",
        x: 190,
        y: 230,
      },
    ];
  }

  if (/\b(plane|airplane|aeroplane)\b/.test(blob)) {
    return [
      {
        type: "icon",
        id: "plane",
        icon: "plane",
        x: 150,
        y: 70,
        size: 160,
      },
      { type: "write", text: "airplane", x: 190, y: 250 },
    ];
  }

  if (/\bheart\b/.test(blob)) {
    return [
      {
        type: "icon",
        id: "heart",
        icon: "heart",
        x: 170,
        y: 60,
        size: 140,
        color: "#e06c60",
      },
      { type: "write", text: "heart", x: 205, y: 230 },
    ];
  }

  if (
    /\b(class|classes|oop|object[- ]oriented|blueprint)\b/.test(blob) &&
    !/\b(hexagon|circle|triangle|polygon)\b/.test(blob)
  ) {
    return [
      {
        type: "icon",
        id: "classroom",
        icon: "school",
        x: 70,
        y: 50,
        size: 150,
      },
      {
        type: "icon",
        id: "car",
        icon: "car",
        x: 290,
        y: 80,
        size: 110,
      },
      {
        type: "arrow",
        id: "link",
        from: [230, 120],
        to: [285, 120],
      },
      { type: "write", text: "class / classroom", x: 70, y: 230 },
      { type: "write", text: "Car", x: 320, y: 220, color: "#7dcea0" },
    ];
  }

  if (/\b(for-?loop|while-?loop|loops?|iteration)\b/.test(blob)) {
    return [
      {
        type: "icon",
        id: "loop",
        icon: "repeat",
        x: 170,
        y: 55,
        size: 140,
      },
      { type: "write", text: "loop · repeat", x: 175, y: 230 },
    ];
  }

  if (/\b(stack|lifo|call stack)\b/.test(blob)) {
    return [
      {
        type: "icon",
        id: "stack",
        icon: "stack-2",
        x: 170,
        y: 50,
        size: 150,
      },
      { type: "write", text: "stack", x: 205, y: 230 },
    ];
  }

  if (/\b(binary tree|bst|tree)\b/.test(blob)) {
    return [
      {
        type: "icon",
        id: "tree",
        icon: "binary-tree",
        x: 160,
        y: 45,
        size: 160,
      },
      { type: "write", text: "tree", x: 210, y: 240 },
    ];
  }

  const label = (
    input.highlight ||
    input.conceptKey ||
    input.prompt.replace(/^(what is|explain|define)\s+/i, "").slice(0, 28) ||
    "idea"
  ).trim();

  return [
    {
      type: "icon",
      id: "idea",
      icon: "bulb",
      x: 175,
      y: 55,
      size: 130,
    },
    { type: "write", text: label || "idea", x: 180, y: 220 },
  ];
}
