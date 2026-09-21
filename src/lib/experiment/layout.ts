import type {
  ExperimentLesson,
  ExperimentShape,
  ExperimentSide,
} from "@/lib/experiment/scene";
import { nodeCluster } from "@/lib/experiment/scene";
import { looksLikeCode } from "@/lib/experiment/boardText";

/** Clear space between labels, notes, and separate concept boxes. */
export const SHAPE_GAP = 40;
/** Figure parts in the same diagram may touch or slightly overlap. */
const PART_TOUCH = 8;

const MAX_GEO_INNER_CHARS = 26;
const GEO_CHAR_W = 16;
const GEO_LINE_H = 30;
const GEO_PAD_X = 52;
const GEO_PAD_Y = 40;
const TEXT_CHAR_W = 18;
const TEXT_LINE_H = 38;
const NOTE_SIZE = 200;
const MIN_GEO_W = 120;
const MIN_GEO_H = 64;
const MAX_GEO_W = 460;
const MAX_GEO_H = 280;
const MIN_PART_W = 48;
const MIN_PART_H = 40;
const MAX_PART_LABEL = 14;

export type ShapeBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  gap = SHAPE_GAP,
): boolean {
  return (
    a.x < b.x + b.w + gap &&
    a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap &&
    a.y + a.h + gap > b.y
  );
}

function wrapLines(text: string, maxChars: number): string[] {
  const source = text.replace(/\\n/g, "\n");
  const paragraphs = source.split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/ +/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = "";
    const leading = paragraph.match(/^ */)?.[0] ?? "";
    for (const word of words) {
      if (word.length > maxChars) {
        if (current) {
          lines.push(current);
          current = "";
        }
        for (let i = 0; i < word.length; i += maxChars) {
          lines.push(word.slice(i, i + maxChars));
        }
        continue;
      }
      const trial = current ? `${current} ${word}` : `${leading}${word}`;
      if (trial.length > maxChars && current) {
        lines.push(current);
        current = `${leading}${word}`;
      } else {
        current = trial;
      }
    }
    if (current) lines.push(current);
  }
  return lines.length ? lines : [""];
}

function measureText(text: string): { w: number; h: number } {
  if (looksLikeCode(text) || text.includes("\n")) {
    const lines = text.split("\n");
    const longest = Math.max(...lines.map((line) => line.length), 1);
    return {
      w: Math.min(640, Math.max(48, longest * 11)),
      h: Math.max(TEXT_LINE_H, lines.length * 22),
    };
  }
  const lines = wrapLines(text, 36);
  const longest = Math.max(...lines.map((line) => line.length), 1);
  return {
    w: Math.min(520, Math.max(48, longest * TEXT_CHAR_W)),
    h: Math.max(TEXT_LINE_H, lines.length * TEXT_LINE_H),
  };
}

function isFigureGeo(shape: Extract<ExperimentShape, { type: "geo" }>) {
  return (
    shape.geo !== "rectangle" &&
    !shape.geo.startsWith("arrow-")
  );
}

function fitText(shape: Extract<ExperimentShape, { type: "text" }>) {
  const raw = shape.text.trim();
  if (looksLikeCode(raw)) return;
  if (raw.includes("\n")) return;
  if (raw.length <= MAX_GEO_INNER_CHARS) return;
  shape.text = wrapLines(raw, MAX_GEO_INNER_CHARS).join("\n");
}

function fitCallout(shape: Extract<ExperimentShape, { type: "callout" }>) {
  const raw = shape.text.trim();
  if (raw.length <= 22) return;
  shape.text = wrapLines(raw, 22).join("\n");
}

function fitGeo(
  shape: Extract<ExperimentShape, { type: "geo" }>,
  asPart: boolean,
) {
  const raw = shape.label?.trim() ?? "";
  const code = looksLikeCode(raw);
  if (asPart && !code) {
    shape.w = Math.min(320, Math.max(MIN_PART_W, shape.w));
    shape.h = Math.min(280, Math.max(MIN_PART_H, shape.h));
    if (raw.length > MAX_PART_LABEL) {
      delete shape.label;
    }
    return;
  }
  if (!raw) {
    shape.w = Math.max(MIN_GEO_W, shape.w);
    shape.h = Math.max(MIN_GEO_H, shape.h);
    return;
  }
  const lines = code
    ? raw.split("\n")
    : wrapLines(raw, MAX_GEO_INNER_CHARS);
  if (!code) shape.label = lines.join("\n");
  const longest = Math.max(...lines.map((line) => line.length), 1);
  const maxW = code ? 620 : MAX_GEO_W;
  const maxH = code ? 420 : MAX_GEO_H;
  const charW = code ? 11 : GEO_CHAR_W;
  const lineH = code ? 22 : GEO_LINE_H;
  shape.w = Math.min(
    maxW,
    Math.max(MIN_GEO_W, shape.w, Math.ceil(longest * charW + GEO_PAD_X)),
  );
  shape.h = Math.min(
    maxH,
    Math.max(
      MIN_GEO_H,
      shape.h,
      Math.ceil(lines.length * lineH + GEO_PAD_Y),
    ),
  );
}

export function shapeBounds(shape: ExperimentShape): ShapeBox | null {
  if (shape.type === "geo") {
    return { id: shape.id, x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  }
  if (shape.type === "text" || shape.type === "callout") {
    const size = measureText(shape.text);
    return { id: shape.id, x: shape.x, y: shape.y, w: size.w, h: size.h };
  }
  if (shape.type === "note") {
    return { id: shape.id, x: shape.x, y: shape.y, w: NOTE_SIZE, h: NOTE_SIZE };
  }
  return null;
}

function contains(outer: ShapeBox, inner: ShapeBox): boolean {
  const cx = inner.x + inner.w / 2;
  const cy = inner.y + inner.h / 2;
  return (
    cx >= outer.x &&
    cx <= outer.x + outer.w &&
    cy >= outer.y &&
    cy <= outer.y + outer.h &&
    outer.w * outer.h > inner.w * inner.h * 1.05
  );
}

function overlapArea(a: ShapeBox, b: ShapeBox): number {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

function unionBox(boxes: ShapeBox[]): ShapeBox | null {
  if (!boxes.length) return null;
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const maxX = Math.max(...boxes.map((box) => box.x + box.w));
  const maxY = Math.max(...boxes.map((box) => box.y + box.h));
  return { id: boxes[0]!.id, x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function applyBox(shape: ExperimentShape, box: ShapeBox) {
  if (shape.type === "arrow") return;
  shape.x = box.x;
  shape.y = box.y;
  if (shape.type === "geo") {
    shape.w = box.w;
    shape.h = box.h;
  }
}

function translateShape(shape: ExperimentShape, dx: number, dy: number) {
  if (shape.type === "arrow") return;
  shape.x += dx;
  shape.y += dy;
}

class UnionFind {
  private parent = new Map<string, string>();

  add(id: string) {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    const parent = this.parent.get(id) ?? id;
    if (parent !== id) {
      const root = this.find(parent);
      this.parent.set(id, root);
      return root;
    }
    return id;
  }

  union(a: string, b: string) {
    this.add(a);
    this.add(b);
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }

  groups(): Map<string, string[]> {
    const buckets = new Map<string, string[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      const list = buckets.get(root) ?? [];
      list.push(id);
      buckets.set(root, list);
    }
    return buckets;
  }
}

function autoClusterGeos(geos: Extract<ExperimentShape, { type: "geo" }>[]) {
  const uf = new UnionFind();
  for (const geo of geos) {
    uf.add(geo.id);
    if (geo.cluster) uf.union(geo.id, `cluster:${geo.cluster}`);
  }
  for (let i = 0; i < geos.length; i += 1) {
    const a = geos[i]!;
    for (let j = i + 1; j < geos.length; j += 1) {
      const b = geos[j]!;
      const touching = rectsOverlap(a, b, PART_TOUCH);
      if (!touching) continue;
      if (a.cluster && b.cluster) {
        uf.union(a.id, b.id);
        continue;
      }
      if (isFigureGeo(a) || isFigureGeo(b) || a.cluster || b.cluster) {
        uf.union(a.id, b.id);
      }
    }
  }

  let auto = 0;
  for (const members of uf.groups().values()) {
    const geoIds = members.filter((id) => !id.startsWith("cluster:"));
    if (geoIds.length < 2) continue;
    const named = geos.find(
      (geo) => geoIds.includes(geo.id) && geo.cluster,
    )?.cluster;
    const cluster = named || `fig${auto++}`;
    for (const geo of geos) {
      if (!geoIds.includes(geo.id)) continue;
      geo.cluster = cluster;
      geo.role = geo.role ?? "part";
    }
  }
}

function dropCoveredText(
  nodes: ExperimentShape[],
  boxes: Map<string, ShapeBox>,
): Set<string> {
  const drop = new Set<string>();
  const geos = nodes.filter((shape) => shape.type === "geo");
  const minGeoY = geos.length
    ? Math.min(...geos.map((shape) => shape.y))
    : Number.POSITIVE_INFINITY;

  for (const shape of nodes) {
    if (shape.type !== "text") continue;
    if (shape.role === "title" || shape.role === "label") continue;
    const textBox = boxes.get(shape.id);
    if (!textBox) continue;
    const looksLikeTitle = textBox.y + textBox.h <= minGeoY - 8;
    if (looksLikeTitle) continue;

    for (const geo of geos) {
      const geoBox = boxes.get(geo.id);
      if (!geoBox) continue;
      const area = overlapArea(textBox, geoBox);
      if (area <= 0) continue;
      const covered = area / Math.max(textBox.w * textBox.h, 1) >= 0.35;
      const labelMatch =
        (geo.label ?? "")
          .replace(/\s+/g, " ")
          .toLowerCase()
          .includes(shape.text.trim().toLowerCase()) ||
        shape.text.trim().toLowerCase().length <= 24;
      if (covered && labelMatch) {
        drop.add(shape.id);
        break;
      }
    }
  }
  return drop;
}

function unpackNested(
  boxes: ShapeBox[],
  skip: Set<string>,
) {
  for (let pass = 0; pass < 10; pass += 1) {
    let moved = false;
    const byArea = [...boxes].sort((a, b) => b.w * b.h - a.w * a.h);
    for (let i = 0; i < byArea.length; i += 1) {
      const outer = byArea[i]!;
      if (skip.has(outer.id)) continue;
      for (let j = i + 1; j < byArea.length; j += 1) {
        const inner = byArea[j]!;
        if (skip.has(inner.id)) continue;
        if (!contains(outer, inner)) continue;
        inner.y = outer.y + outer.h + SHAPE_GAP;
        inner.x = Math.max(inner.x, outer.x);
        moved = true;
      }
    }
    if (!moved) break;
  }
}

function resolveCollisions(boxes: ShapeBox[], skipPair: (a: string, b: string) => boolean) {
  for (let pass = 0; pass < 80; pass += 1) {
    let moved = false;
    const order = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x);
    for (let i = 0; i < order.length; i += 1) {
      const a = order[i]!;
      for (let j = i + 1; j < order.length; j += 1) {
        const b = order[j]!;
        if (skipPair(a.id, b.id)) continue;
        if (!rectsOverlap(a, b, SHAPE_GAP)) continue;
        const overlapX =
          Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const sameRow = Math.abs(a.y - b.y) < 40;
        const fitsRight = a.x + a.w + SHAPE_GAP + b.w <= 1080;
        if (
          sameRow &&
          b.x >= a.x - 8 &&
          overlapX < a.w * 0.8 &&
          fitsRight
        ) {
          b.x = a.x + a.w + SHAPE_GAP;
        } else {
          b.y = Math.max(b.y, a.y + a.h + SHAPE_GAP);
        }
        moved = true;
      }
    }
    if (!moved) break;
  }

  const minX = Math.min(...boxes.map((box) => box.x), 0);
  const minY = Math.min(...boxes.map((box) => box.y), 0);
  if (minX < 0) {
    for (const box of boxes) box.x -= minX;
  }
  if (minY < 0) {
    for (const box of boxes) box.y -= minY;
  }
}

function extractPartCallouts(nodes: ExperimentShape[]): ExperimentShape[] {
  const existing = new Set(
    nodes
      .filter((shape) => shape.type === "callout")
      .map((shape) => `${shape.to}:${shape.text.toLowerCase()}`),
  );
  const created: ExperimentShape[] = [];
  for (const shape of nodes) {
    if (shape.type !== "geo" || !shape.cluster) continue;
    const label = shape.label?.trim() ?? "";
    if (label.length <= MAX_PART_LABEL) continue;
    if (looksLikeCode(label) || label.includes("\n")) continue;
    const key = `${shape.id}:${label.toLowerCase()}`;
    if (existing.has(key)) {
      delete shape.label;
      continue;
    }
    const calloutId = `${shape.id}_name`.slice(0, 40);
    if (nodes.some((node) => node.id === calloutId)) {
      delete shape.label;
      continue;
    }
    created.push({
      id: calloutId,
      type: "callout",
      x: shape.x - 160,
      y: shape.y,
      text: label,
      to: shape.id,
      color: "black",
    });
    existing.add(key);
    delete shape.label;
  }
  return created;
}

function placeCallouts(
  callouts: Extract<ExperimentShape, { type: "callout" }>[],
  byId: Map<string, ExperimentShape>,
) {
  if (!callouts.length) return;
  const targets = callouts
    .map((callout) => shapeBounds(byId.get(callout.to) ?? callout))
    .filter((box): box is ShapeBox => Boolean(box));
  const figure = unionBox(targets);
  if (!figure) return;

  const left: typeof callouts = [];
  const right: typeof callouts = [];
  for (const callout of callouts) {
    const target = byId.get(callout.to);
    const box = target ? shapeBounds(target) : null;
    const side: ExperimentSide =
      callout.side ??
      (box && box.x + box.w / 2 < figure.x + figure.w / 2 ? "left" : "right");
    callout.side = side;
    if (side === "left" || side === "top") left.push(callout);
    else right.push(callout);
  }

  const layoutColumn = (
    column: typeof callouts,
    side: "left" | "right",
  ) => {
    let y = figure.y;
    for (const callout of column) {
      fitCallout(callout);
      const size = measureText(callout.text);
      callout.x =
        side === "left"
          ? figure.x - SHAPE_GAP - size.w
          : figure.x + figure.w + SHAPE_GAP;
      callout.y = y;
      y += size.h + 18;
    }
  };

  layoutColumn(left, "left");
  layoutColumn(right, "right");
}

function sameCluster(
  a: ExperimentShape | undefined,
  b: ExperimentShape | undefined,
) {
  const ca = a ? nodeCluster(a) : undefined;
  const cb = b ? nodeCluster(b) : undefined;
  return Boolean(ca && cb && ca === cb);
}

export function overlappingPairs(
  shapes: ExperimentShape[],
  gap = SHAPE_GAP,
  options?: { skipSameCluster?: boolean },
): Array<[string, string]> {
  const boxes = shapes
    .map(shapeBounds)
    .filter((box): box is ShapeBox => Boolean(box));
  const byId = new Map(shapes.map((shape) => [shape.id, shape]));
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      if (options?.skipSameCluster && sameCluster(byId.get(a.id), byId.get(b.id))) {
        continue;
      }
      if (rectsOverlap(a, b, gap)) pairs.push([a.id, b.id]);
    }
  }
  return pairs;
}

export function layoutShapes(shapes: ExperimentShape[]): ExperimentShape[] {
  const arrows = shapes.filter((shape) => shape.type === "arrow");
  const nodes = shapes.filter((shape) => shape.type !== "arrow");
  if (!nodes.length) return shapes;

  const geos = nodes.filter(
    (shape): shape is Extract<ExperimentShape, { type: "geo" }> =>
      shape.type === "geo",
  );
  autoClusterGeos(geos);
  const extras = extractPartCallouts(nodes);

  for (const shape of nodes) {
    if (shape.type === "geo") fitGeo(shape, Boolean(shape.cluster));
    if (shape.type === "text") fitText(shape);
    if (shape.type === "callout") fitCallout(shape);
  }
  for (const extra of extras) {
    if (extra.type === "callout") fitCallout(extra);
  }
  const allNodes = [...nodes, ...extras];

  const boxes = new Map<string, ShapeBox>();
  for (const shape of allNodes) {
    const box = shapeBounds(shape);
    if (box) boxes.set(shape.id, box);
  }

  const drop = dropCoveredText(allNodes, boxes);
  const keptNodes = allNodes.filter((shape) => !drop.has(shape.id));
  const byId = new Map(keptNodes.map((shape) => [shape.id, shape]));

  const clusteredIds = new Set(
    keptNodes
      .filter((shape) => shape.type === "geo" && shape.cluster)
      .map((shape) => shape.id),
  );

  const movable = keptNodes
    .filter((shape) => shape.type !== "callout")
    .map((shape) => boxes.get(shape.id))
    .filter((box): box is ShapeBox => Boolean(box));

  unpackNested(movable, clusteredIds);
  resolveCollisions(movable, (a, b) => {
    const sa = byId.get(a);
    const sb = byId.get(b);
    return sameCluster(sa, sb);
  });

  for (const box of movable) {
    const shape = byId.get(box.id);
    if (shape) applyBox(shape, box);
  }

  const callouts = keptNodes.filter(
    (shape): shape is Extract<ExperimentShape, { type: "callout" }> =>
      shape.type === "callout",
  );
  placeCallouts(callouts, byId);

  const titles = keptNodes.filter(
    (shape) =>
      shape.type === "text" &&
      (shape.role === "title" || shape.y < 70),
  );
  const figureBoxes = keptNodes
    .filter((shape) => shape.type === "geo")
    .map(shapeBounds)
    .filter((box): box is ShapeBox => Boolean(box));
  const figure = unionBox(figureBoxes);
  if (figure) {
    for (const title of titles) {
      const size = measureText(title.type === "text" ? title.text : "");
      title.x = figure.x + Math.max(0, (figure.w - size.w) / 2);
      title.y = Math.min(title.y, figure.y - size.h - 24);
    }
  }

  const minX = Math.min(
    ...keptNodes.map((shape) =>
      shape.type === "arrow" ? 0 : shape.x,
    ),
    0,
  );
  const minY = Math.min(
    ...keptNodes.map((shape) =>
      shape.type === "arrow" ? 0 : shape.y,
    ),
    0,
  );
  if (minX < 0 || minY < 0) {
    for (const shape of keptNodes) {
      translateShape(shape, minX < 0 ? -minX : 0, minY < 0 ? -minY : 0);
    }
  }

  const nodeIds = new Set(keptNodes.map((shape) => shape.id));
  const keptArrows = arrows.filter(
    (arrow) =>
      arrow.type === "arrow" &&
      nodeIds.has(arrow.from) &&
      nodeIds.has(arrow.to) &&
      arrow.from !== arrow.to,
  );
  const keptCallouts = callouts.filter((callout) => nodeIds.has(callout.to));

  return [
    ...keptNodes.filter((shape) => shape.type !== "callout"),
    ...keptCallouts,
    ...keptArrows,
  ];
}

export function layoutLesson(lesson: ExperimentLesson): ExperimentLesson {
  const original = lesson.beats.flatMap((beat) => beat.shapes);
  if (!original.length) return lesson;
  const originalIds = new Set(original.map((shape) => shape.id));
  const laid = layoutShapes(original);
  const keep = new Set(laid.map((shape) => shape.id));
  const extras = laid.filter((shape) => !originalIds.has(shape.id));

  for (const beat of lesson.beats) {
    beat.shapes = beat.shapes.filter((shape) => keep.has(shape.id));
  }
  for (const extra of extras) {
    if (extra.type !== "callout") continue;
    const owner =
      lesson.beats.find((beat) =>
        beat.shapes.some((shape) => shape.id === extra.to),
      ) ?? lesson.beats[0];
    owner?.shapes.push(extra);
  }
  return lesson;
}
