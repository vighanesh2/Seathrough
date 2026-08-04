import type { LibraryElement } from "@/lib/automatic-drawing/library";

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** Absolute point list for line/draw/freedraw/arrow elements. */
export function absolutePoints(el: LibraryElement): Array<[number, number]> {
  const x = num(el.x);
  const y = num(el.y);
  const raw = el.points;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [[x, y]];
  }
  return raw.map((pt) => {
    if (Array.isArray(pt) && pt.length >= 2) {
      return [x + num(pt[0]), y + num(pt[1])] as [number, number];
    }
    return [x, y] as [number, number];
  });
}

export function pointsToPath(points: Array<[number, number]>, closed = false): string {
  if (!points.length) return "";
  const [first, ...rest] = points;
  let d = `M ${first![0]} ${first![1]}`;
  for (const p of rest) d += ` L ${p[0]} ${p[1]}`;
  if (closed) d += " Z";
  return d;
}

export function diamondPoints(
  x: number,
  y: number,
  width: number,
  height: number,
): Array<[number, number]> {
  const cx = x + width / 2;
  const cy = y + height / 2;
  return [
    [cx, y],
    [x + width, cy],
    [cx, y + height],
    [x, cy],
  ];
}

export function elementBounds(el: LibraryElement): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const type = str(el.type);
  const x = num(el.x);
  const y = num(el.y);
  const w = num(el.width);
  const h = num(el.height);

  if (
    type === "line" ||
    type === "draw" ||
    type === "freedraw" ||
    type === "arrow"
  ) {
    const pts = absolutePoints(el);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [px, py] of pts) {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    if (!Number.isFinite(minX)) {
      return { minX: x, minY: y, maxX: x + 1, maxY: y + 1 };
    }
    return { minX, minY, maxX, maxY };
  }

  return { minX: x, minY: y, maxX: x + w, maxY: y + h };
}

export function sceneBounds(elements: LibraryElement[], pad = 40) {
  if (!elements.length) {
    return { minX: 0, minY: 0, width: 900, height: 600 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    if (el.isDeleted) continue;
    const b = elementBounds(el);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, width: 900, height: 600 };
  }
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: Math.max(200, maxX - minX + pad * 2),
    height: Math.max(160, maxY - minY + pad * 2),
  };
}

export function fillFor(el: LibraryElement): string {
  const fill = str(el.backgroundColor, "transparent");
  if (!fill || fill === "transparent") return "none";
  const style = str(el.fillStyle, "solid");
  // Hachure approximates as light fill for SVG preview
  if (style === "hachure" || style === "cross-hatch") {
    return fill;
  }
  return fill;
}

export function strokeFor(el: LibraryElement): string {
  return str(el.strokeColor, "#1a2b3c");
}

export function strokeWidthFor(el: LibraryElement): number {
  const w = num(el.strokeWidth, 1);
  return Math.max(1, w);
}
