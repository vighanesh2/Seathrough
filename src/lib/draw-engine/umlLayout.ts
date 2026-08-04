import {
  DRAW_CANVAS_HEIGHT,
  DRAW_CANVAS_WIDTH,
} from "@/lib/draw-engine/commands";
import type {
  UmlClassNode,
  UmlDiagramPlan,
  UmlRelationship,
} from "@/lib/draw-engine/umlSchema";

export const UML_BOX_WIDTH = 190;
const BOX_GAP_X = 28;
const BOX_GAP_Y = 56;
const MARGIN_X = 48;
const MARGIN_Y = 78;

export type UmlBox = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type UmlEdgeGeom = {
  relId: string;
  /** Polyline from source border → target border (last segment gets the arrowhead). */
  points: Array<{ x: number; y: number }>;
  labelX: number;
  labelY: number;
  label: string;
};

export function classBoxHeight(cls: UmlClassNode): number {
  const rows = Math.min(4, cls.attributes.length) + Math.min(4, cls.methods.length);
  return Math.max(72, 38 + rows * 18);
}

/**
 * Deterministic non-overlapping layout for class diagrams.
 * Ignores LLM x/y (often collide) and places by inheritance + associations.
 */
export function layoutUmlClassPlan(plan: UmlDiagramPlan): UmlDiagramPlan {
  if (plan.kind !== "class" || plan.classes.length === 0) return plan;

  const parentOf = new Map<string, string>();
  for (const rel of plan.relationships) {
    if (rel.kind === "inheritance") {
      // from = child, to = parent (UML convention in our schema)
      parentOf.set(rel.from, rel.to);
    }
  }

  const childrenOf = new Map<string, string[]>();
  for (const [child, parent] of parentOf) {
    const list = childrenOf.get(parent) ?? [];
    list.push(child);
    childrenOf.set(parent, list);
  }

  const roots = plan.classes
    .filter((c) => !parentOf.has(c.id))
    .map((c) => c.id);

  const placed = new Map<string, { x: number; y: number }>();
  const heights = new Map(
    plan.classes.map((c) => [c.id, classBoxHeight(c)] as const),
  );

  // Layer 0: roots (prefer the most-inherited parent first)
  const rootScore = (id: string) => (childrenOf.get(id)?.length ?? 0);
  const orderedRoots = [...roots].sort((a, b) => rootScore(b) - rootScore(a));

  let cursorY = MARGIN_Y;
  placeRow(orderedRoots, cursorY, placed, heights);
  cursorY += maxHeight(orderedRoots, heights) + BOX_GAP_Y;

  // Subsequent layers: children of already-placed parents
  const remaining = new Set(
    plan.classes.map((c) => c.id).filter((id) => !placed.has(id)),
  );
  let guard = 0;
  while (remaining.size && guard++ < 12) {
    const layer: string[] = [];
    for (const id of remaining) {
      const parent = parentOf.get(id);
      if (parent && placed.has(parent)) layer.push(id);
    }
    if (!layer.length) break;
    // Group under parent x when possible
    layer.sort((a, b) => {
      const pa = placed.get(parentOf.get(a)!)!.x;
      const pb = placed.get(parentOf.get(b)!)!.x;
      return pa - pb || a.localeCompare(b);
    });
    placeRowUnderParents(layer, parentOf, placed, heights, cursorY);
    cursorY += maxHeight(layer, heights) + BOX_GAP_Y;
    for (const id of layer) remaining.delete(id);
  }

  // Leftovers (association-only nodes like Driver)
  if (remaining.size) {
    const leftovers = [...remaining];
    placeRow(leftovers, Math.min(cursorY, DRAW_CANVAS_HEIGHT - 160), placed, heights);
  }

  // Nudge any residual overlaps
  const boxes: UmlBox[] = plan.classes.map((c) => {
    const p = placed.get(c.id) ?? { x: MARGIN_X, y: MARGIN_Y };
    return {
      id: c.id,
      x: p.x,
      y: p.y,
      w: UML_BOX_WIDTH,
      h: heights.get(c.id) ?? 72,
    };
  });
  resolveOverlaps(boxes);

  const byId = new Map(boxes.map((b) => [b.id, b]));
  return {
    ...plan,
    classes: plan.classes.map((c) => {
      const b = byId.get(c.id)!;
      return { ...c, x: b.x, y: b.y };
    }),
  };
}

function placeRow(
  ids: string[],
  y: number,
  placed: Map<string, { x: number; y: number }>,
  _heights: Map<string, number>,
) {
  if (!ids.length) return;
  void _heights;
  const totalW =
    ids.length * UML_BOX_WIDTH + (ids.length - 1) * BOX_GAP_X;
  let x = Math.max(MARGIN_X, (DRAW_CANVAS_WIDTH - totalW) / 2);
  for (const id of ids) {
    placed.set(id, { x, y });
    x += UML_BOX_WIDTH + BOX_GAP_X;
  }
}

function placeRowUnderParents(
  ids: string[],
  parentOf: Map<string, string>,
  placed: Map<string, { x: number; y: number }>,
  heights: Map<string, number>,
  y: number,
) {
  // Ideal x = parent center - half width; then pack without overlap
  const desired = ids.map((id) => {
    const parent = placed.get(parentOf.get(id)!)!;
    return {
      id,
      x: parent.x + UML_BOX_WIDTH / 2 - UML_BOX_WIDTH / 2,
    };
  });
  desired.sort((a, b) => a.x - b.x);

  let prevRight = MARGIN_X - BOX_GAP_X;
  for (const item of desired) {
    let x = Math.max(item.x, prevRight + BOX_GAP_X);
    x = Math.min(x, DRAW_CANVAS_WIDTH - UML_BOX_WIDTH - MARGIN_X);
    placed.set(item.id, { x, y });
    prevRight = x + UML_BOX_WIDTH;
  }
  void heights;
}

function maxHeight(ids: string[], heights: Map<string, number>): number {
  return ids.reduce((m, id) => Math.max(m, heights.get(id) ?? 72), 72);
}

function resolveOverlaps(boxes: UmlBox[]) {
  // Simple iterative push-apart on X then clamp
  for (let iter = 0; iter < 8; iter++) {
    let moved = false;
    const sorted = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]!;
        const b = sorted[j]!;
        if (!rectsOverlap(a, b, 12)) continue;
        // Same band → push horizontally; else push vertically
        if (Math.abs(a.y - b.y) < Math.max(a.h, b.h) * 0.6) {
          const mid = (a.x + a.w / 2 + b.x + b.w / 2) / 2;
          a.x = Math.max(MARGIN_X, mid - BOX_GAP_X / 2 - a.w);
          b.x = Math.min(
            DRAW_CANVAS_WIDTH - MARGIN_X - b.w,
            mid + BOX_GAP_X / 2,
          );
          moved = true;
        } else {
          b.y = Math.min(
            DRAW_CANVAS_HEIGHT - 40 - b.h,
            a.y + a.h + BOX_GAP_Y,
          );
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

function rectsOverlap(a: UmlBox, b: UmlBox, pad: number): boolean {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

/**
 * Compute border-anchored routes that avoid crossing through other boxes.
 */
export function computeUmlEdges(
  plan: UmlDiagramPlan,
): Map<string, UmlEdgeGeom> {
  const boxes: UmlBox[] = plan.classes.map((c) => ({
    id: c.id,
    x: c.x,
    y: c.y,
    w: UML_BOX_WIDTH,
    h: classBoxHeight(c),
  }));
  const byId = new Map(boxes.map((b) => [b.id, b]));

  // Count edges per (box, side) for fan-out
  type Side = "top" | "bottom" | "left" | "right";
  const sideCounts = new Map<string, number>();
  const sideIndex = new Map<string, number>();
  const key = (id: string, side: Side) => `${id}:${side}`;

  const drafts: Array<{
    rel: UmlRelationship;
    fromSide: Side;
    toSide: Side;
  }> = [];

  for (const rel of plan.relationships) {
    const from = byId.get(rel.from);
    const to = byId.get(rel.to);
    if (!from || !to) continue;
    const { fromSide, toSide } = pickSides(from, to, rel.kind);
    drafts.push({ rel, fromSide, toSide });
    sideCounts.set(
      key(rel.from, fromSide),
      (sideCounts.get(key(rel.from, fromSide)) ?? 0) + 1,
    );
    sideCounts.set(
      key(rel.to, toSide),
      (sideCounts.get(key(rel.to, toSide)) ?? 0) + 1,
    );
  }

  const out = new Map<string, UmlEdgeGeom>();

  for (const { rel, fromSide, toSide } of drafts) {
    const from = byId.get(rel.from)!;
    const to = byId.get(rel.to)!;
    const fi =
      sideIndex.get(key(rel.from, fromSide)) ?? 0;
    sideIndex.set(key(rel.from, fromSide), fi + 1);
    const ti = sideIndex.get(key(rel.to, toSide)) ?? 0;
    sideIndex.set(key(rel.to, toSide), ti + 1);

    const fromN = sideCounts.get(key(rel.from, fromSide)) ?? 1;
    const toN = sideCounts.get(key(rel.to, toSide)) ?? 1;

    const p1 = anchorOnSide(from, fromSide, fi, fromN);
    const p2 = anchorOnSide(to, toSide, ti, toN);

    const obstacles = boxes.filter(
      (b) => b.id !== rel.from && b.id !== rel.to,
    );
    const points = routeAround(p1, p2, fromSide, toSide, obstacles);
    const label = (rel.label || shortKind(rel.kind)).slice(0, 28);
    const { labelX, labelY } = placeLabel(points, obstacles, label.length);

    out.set(rel.id, {
      relId: rel.id,
      points,
      labelX,
      labelY,
      label,
    });
  }

  return out;
}

function shortKind(kind: UmlRelationship["kind"]): string {
  if (kind === "inheritance") return "extends";
  return kind;
}

function pickSides(
  from: UmlBox,
  to: UmlBox,
  kind: UmlRelationship["kind"],
): { fromSide: Side; toSide: Side } {
  const fromCx = from.x + from.w / 2;
  const fromCy = from.y + from.h / 2;
  const toCx = to.x + to.w / 2;
  const toCy = to.y + to.h / 2;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;

  if (kind === "inheritance") {
    // Child below parent → child top → parent bottom
    if (fromCy > toCy) return { fromSide: "top", toSide: "bottom" };
    if (fromCy < toCy) return { fromSide: "bottom", toSide: "top" };
  }

  if (Math.abs(dy) > Math.abs(dx) * 1.1) {
    return dy > 0
      ? { fromSide: "bottom", toSide: "top" }
      : { fromSide: "top", toSide: "bottom" };
  }
  return dx > 0
    ? { fromSide: "right", toSide: "left" }
    : { fromSide: "left", toSide: "right" };
}

type Side = "top" | "bottom" | "left" | "right";

function anchorOnSide(
  box: UmlBox,
  side: Side,
  index: number,
  total: number,
): { x: number; y: number } {
  const t = total <= 1 ? 0.5 : (index + 1) / (total + 1);
  switch (side) {
    case "top":
      return { x: box.x + box.w * t, y: box.y };
    case "bottom":
      return { x: box.x + box.w * t, y: box.y + box.h };
    case "left":
      return { x: box.x, y: box.y + box.h * t };
    case "right":
      return { x: box.x + box.w, y: box.y + box.h * t };
  }
}

function segmentHitsBox(
  a: { x: number; y: number },
  b: { x: number; y: number },
  box: UmlBox,
  pad = 8,
): boolean {
  const r = {
    x: box.x - pad,
    y: box.y - pad,
    w: box.w + pad * 2,
    h: box.h + pad * 2,
  };
  // Liang-Barsky-ish coarse: sample midpoints
  for (let i = 1; i <= 8; i++) {
    const t = i / 9;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

function routeAround(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  fromSide: Side,
  toSide: Side,
  obstacles: UmlBox[],
): Array<{ x: number; y: number }> {
  const directClear = !obstacles.some((o) => segmentHitsBox(p1, p2, o));
  if (directClear) return [p1, p2];

  // Orthogonal elbows: HV and VH
  const midH = { x: p2.x, y: p1.y };
  const midV = { x: p1.x, y: p2.y };

  const tryPath = (pts: Array<{ x: number; y: number }>) => {
    for (let i = 0; i < pts.length - 1; i++) {
      if (obstacles.some((o) => segmentHitsBox(pts[i]!, pts[i + 1]!, o))) {
        return false;
      }
    }
    return true;
  };

  const hv = [p1, midH, p2];
  if (tryPath(hv)) return hv;
  const vh = [p1, midV, p2];
  if (tryPath(vh)) return vh;

  // Outer bypass: go around vertically past all obstacles
  const minY = Math.min(...obstacles.map((o) => o.y), p1.y, p2.y) - 28;
  const maxY = Math.max(...obstacles.map((o) => o.y + o.h), p1.y, p2.y) + 28;
  const bypassY =
    fromSide === "bottom" || toSide === "top"
      ? Math.min(maxY, DRAW_CANVAS_HEIGHT - 24)
      : Math.max(minY, 48);
  const bypass = [p1, { x: p1.x, y: bypassY }, { x: p2.x, y: bypassY }, p2];
  if (tryPath(bypass)) return bypass;

  // Last resort: offset mid outside horizontally
  const minX = Math.min(...obstacles.map((o) => o.x), p1.x, p2.x) - 28;
  const maxX = Math.max(...obstacles.map((o) => o.x + o.w), p1.x, p2.x) + 28;
  const bypassX =
    p1.x < p2.x
      ? Math.min(maxX, DRAW_CANVAS_WIDTH - 24)
      : Math.max(minX, 24);
  return [p1, { x: bypassX, y: p1.y }, { x: bypassX, y: p2.y }, p2];
}

function placeLabel(
  points: Array<{ x: number; y: number }>,
  obstacles: UmlBox[],
  labelLen: number,
): { labelX: number; labelY: number } {
  const midIndex = Math.max(0, Math.floor((points.length - 1) / 2));
  const a = points[midIndex]!;
  const b = points[Math.min(midIndex + 1, points.length - 1)]!;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // Perpendicular offset
  const ox = (-dy / len) * 16;
  const oy = (dx / len) * 16;
  let labelX = mx + ox - Math.min(40, labelLen * 3.2);
  let labelY = my + oy - 8;

  const inside = (x: number, y: number) =>
    obstacles.some(
      (o) => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h,
    );

  if (inside(labelX + 20, labelY + 6)) {
    labelX = mx - ox - Math.min(40, labelLen * 3.2);
    labelY = my - oy - 8;
  }
  if (inside(labelX + 20, labelY + 6)) {
    labelY = my - 22;
    labelX = mx - 24;
  }

  labelX = Math.max(8, Math.min(DRAW_CANVAS_WIDTH - 120, labelX));
  labelY = Math.max(40, Math.min(DRAW_CANVAS_HEIGHT - 20, labelY));
  return { labelX, labelY };
}

/**
 * Drop classes the lesson never names (keeps inheritance ancestors of kept nodes).
 */
export function pruneUmlToLessonMentions(
  plan: UmlDiagramPlan,
  lessonText: string,
): UmlDiagramPlan {
  if (plan.kind !== "class" || plan.classes.length <= 2) return plan;
  const blob = lessonText.toLowerCase();

  const named = new Set(
    plan.classes
      .filter((c) => new RegExp(`\\b${escapeReg(c.name)}\\b`, "i").test(blob))
      .map((c) => c.id),
  );
  if (named.size < 2) return plan;

  const parentOf = new Map<string, string>();
  for (const rel of plan.relationships) {
    if (rel.kind === "inheritance") parentOf.set(rel.from, rel.to);
  }

  const keep = new Set(named);
  for (const id of named) {
    let cur: string | undefined = id;
    let guard = 0;
    while (cur && guard++ < 8) {
      keep.add(cur);
      cur = parentOf.get(cur);
    }
  }

  const classes = plan.classes.filter((c) => keep.has(c.id));
  if (classes.length < 2) return plan;
  const ids = new Set(classes.map((c) => c.id));
  return {
    ...plan,
    classes,
    relationships: plan.relationships.filter(
      (r) => ids.has(r.from) && ids.has(r.to),
    ),
  };
}

/**
 * Align class attributes/methods with names the lesson narration already uses.
 */
export function alignUmlWithLessonText(
  plan: UmlDiagramPlan,
  lessonText: string,
): UmlDiagramPlan {
  if (plan.kind !== "class") return plan;
  const text = lessonText.replace(/\s+/g, " ");

  return {
    ...plan,
    classes: plan.classes.map((cls) => {
      const attrs = extractAttrsNearName(text, cls.name);
      const methods = extractMethodsNearName(text, cls.name);
      return {
        ...cls,
        attributes: attrs?.length ? attrs : cls.attributes,
        methods: methods?.length ? methods : cls.methods,
      };
    }),
  };
}

function extractAttrsNearName(text: string, name: string): string[] | null {
  const n = escapeReg(name);
  const patterns = [
    new RegExp(
      `${n}[^.]{0,80}attributes?\\s+(?:like\\s+|are\\s+|include\\s+)?([^.]+)`,
      "i",
    ),
    new RegExp(
      `attributes?\\s+(?:like\\s+|are\\s+|include\\s+)?([^.]+?)\\s+(?:in|for|on)\\s+(?:the\\s+)?${n}`,
      "i",
    ),
    new RegExp(`${n}[^.]{0,60}(?:with|has)\\s+([a-z][a-z0-9_,\\s]+)`, "i"),
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const raw = m[1]
      .replace(/\b(and|or|with|such as|e\.g\.|eg)\b/gi, ",")
      .replace(/methods?\b[\s\S]*/i, "");
    const parts = splitNames(raw);
    const filtered = parts.filter(
      (p) =>
        !/^(class|classes|attributes?|methods?|fields?|properties)$/i.test(p),
    );
    if (filtered.length >= 1) {
      return filtered.slice(0, 4).map((p) => formatAttr(p));
    }
  }
  return null;
}

function extractMethodsNearName(text: string, name: string): string[] | null {
  const n = escapeReg(name);
  const patterns = [
    new RegExp(
      `${n}[^.]{0,80}methods?\\s+(?:like\\s+|are\\s+|include\\s+|such as\\s+)?([^.]+)`,
      "i",
    ),
    new RegExp(
      `${n}[^.]{0,60}(?:can|might)\\s+([a-z][a-z0-9_\\s,]+)`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const parts = splitNames(m[1]).filter(
      (p) => !/^(class|methods?|attributes?)$/i.test(p),
    );
    if (parts.length) {
      return parts.slice(0, 4).map((p) => formatMethod(p));
    }
  }
  return null;
}

function splitNames(raw: string): string[] {
  return raw
    .split(/,|\/|&|;|\band\b/i)
    .map((s) => s.trim().replace(/^["'`]+|["'`]+$/g, ""))
    .map((s) => s.replace(/\([^)]*\)/g, "").trim())
    .map((s) => s.replace(/[^a-zA-Z0-9_\s]/g, "").trim())
    .filter((s) => s.length >= 2 && s.length <= 28)
    .map((s) =>
      s
        .split(/\s+/)
        .slice(0, 3)
        .map((w, i) =>
          i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1),
        )
        .join(""),
    );
}

function formatAttr(name: string): string {
  const clean = name.replace(/^\W+/, "");
  const typeGuess = /year|age|count|id|speed|doors|capacity|size/i.test(clean)
    ? "Integer"
    : "String";
  return `- ${clean}: ${typeGuess}`;
}

function formatMethod(name: string): string {
  const clean = name.replace(/^\W+/, "").replace(/\s+/g, "");
  const withParen = /\($/.test(clean) ? clean : `${clean}()`;
  return `+ ${withParen}`;
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
