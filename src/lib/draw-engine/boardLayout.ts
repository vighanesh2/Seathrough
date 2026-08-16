import {
  DRAW_CANVAS_HEIGHT,
  DRAW_CANVAS_WIDTH,
  type DrawCommand,
} from "@/lib/draw-engine/commands";

export type LayoutZone = "title" | "content" | "footer";

export type OccupiedRect = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "title" | "content" | "footer" | "chip" | "uml" | "label" | "other";
};

export type BoardLayout = {
  occupied: OccupiedRect[];
  /** Footer chip slot last-written beat ids (0..2). */
  footerSlots: Array<string | null>;
  contentCursorY: number;
  /** Absolute Y offset for a follow-up section stacked under prior board. */
  sectionOffsetY: number;
  /** Effective content bottom for this section. */
  contentBottom: number;
};

export const FOOTER_Y = 510;
export const FOOTER_H = 44;
export const FOOTER_SLOT_W = 250;
export const FOOTER_SLOT_GAP = 20;
export const FOOTER_SLOT_X = [48, 48 + FOOTER_SLOT_W + FOOTER_SLOT_GAP, 48 + 2 * (FOOTER_SLOT_W + FOOTER_SLOT_GAP)] as const;

export const CONTENT_TOP = 60;
export const CONTENT_BOTTOM = 505;
export const TITLE_TOP = 24;
export const TITLE_BOTTOM = 56;
/** Minimum clear gap between any two reserved content/text boxes. */
export const LAYOUT_PAD = 10;
/** Extra vertical breathing room after each text block. */
export const TEXT_GAP = 28;
/** Gap between prior board content and a new follow-up section. */
export const SECTION_GAP = 72;
/** How far one section may grow before we stop adding to it. */
export const MAX_SECTION_HEIGHT = DRAW_CANVAS_HEIGHT * 3;

const BOARD_BG = "#f3f5f7";

export function createBoardLayout(sectionOffsetY = 0): BoardLayout {
  const offset = Math.max(0, sectionOffsetY);
  return {
    occupied: [],
    footerSlots: [null, null, null],
    contentCursorY: offset + 90,
    sectionOffsetY: offset,
    contentBottom: offset + CONTENT_BOTTOM,
  };
}

export function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  pad = LAYOUT_PAD,
): boolean {
  return !(
    a.x + a.w + pad <= b.x ||
    b.x + b.w + pad <= a.x ||
    a.y + a.h + pad <= b.y ||
    b.y + b.h + pad <= a.y
  );
}

export function layoutIntersects(
  layout: BoardLayout,
  rect: { x: number; y: number; w: number; h: number },
  pad = LAYOUT_PAD,
  ignoreIds?: Set<string>,
): OccupiedRect | null {
  for (const o of layout.occupied) {
    if (ignoreIds?.has(o.id)) continue;
    if (rectsIntersect(rect, o, pad)) return o;
  }
  return null;
}

export function reserve(
  layout: BoardLayout,
  rect: OccupiedRect,
): void {
  // Replace same id if re-reserving
  layout.occupied = layout.occupied.filter((o) => o.id !== rect.id);
  layout.occupied.push({ ...rect });
}

export function release(layout: BoardLayout, idOrPrefix: string): void {
  layout.occupied = layout.occupied.filter(
    (o) => o.id !== idOrPrefix && !o.id.startsWith(`${idOrPrefix}:`),
  );
}

export function releaseKind(layout: BoardLayout, kind: OccupiedRect["kind"]): void {
  layout.occupied = layout.occupied.filter((o) => o.kind !== kind);
}

/**
 * Find a free (x,y) inside a zone for a box of size w×h.
 * Prefers preferX/preferY when free; otherwise scans downward then right.
 */
export function placeInZone(
  layout: BoardLayout,
  zone: LayoutZone,
  w: number,
  h: number,
  prefer?: { x?: number; y?: number },
): { x: number; y: number } | null {
  const bounds = zoneBounds(zone);
  const startX = clamp(
    prefer?.x ?? bounds.x,
    bounds.x,
    bounds.x + bounds.w - w,
  );
  let y = clamp(
    prefer?.y ?? layout.contentCursorY,
    bounds.y,
    bounds.y + bounds.h - h,
  );

  for (let attempt = 0; attempt < 80; attempt++) {
    const candidate = { x: startX, y, w, h };
    if (
      y + h <= bounds.y + bounds.h &&
      !layoutIntersects(layout, candidate)
    ) {
      return { x: startX, y };
    }
    y += Math.max(12, Math.floor(h * 0.35));
    if (y + h > bounds.y + bounds.h) {
      // wrap: try a column to the right
      const nextX = startX + Math.max(40, Math.floor(w * 0.5));
      if (nextX + w > bounds.x + bounds.w) return null;
      return placeInZone(layout, zone, w, h, {
        x: nextX,
        y: bounds.y,
      });
    }
  }
  return null;
}

function zoneBounds(zone: LayoutZone): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  switch (zone) {
    case "title":
      return {
        x: 40,
        y: TITLE_TOP,
        w: DRAW_CANVAS_WIDTH - 80,
        h: TITLE_BOTTOM - TITLE_TOP,
      };
    case "footer":
      return {
        x: 40,
        y: FOOTER_Y,
        w: DRAW_CANVAS_WIDTH - 80,
        h: FOOTER_H + 10,
      };
    case "content":
    default:
      return {
        x: 40,
        y: CONTENT_TOP,
        w: DRAW_CANVAS_WIDTH - 80,
        h: CONTENT_BOTTOM - CONTENT_TOP,
      };
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Place a content/text block by checking the occupied coordinate list.
 * Always leaves TEXT_GAP below the lowest item in the same column.
 * Never draws on top of an existing reservation.
 */
export function placeContent(
  layout: BoardLayout,
  id: string,
  w: number,
  h: number,
  preferX = 80,
): { x: number; y: number } | null {
  const x = clamp(preferX, 40, DRAW_CANVAS_WIDTH - w - 40);
  const top = layout.sectionOffsetY + CONTENT_TOP;

  // Start at cursor, then push below anything that intersects this column.
  let y = Math.max(layout.contentCursorY, top);
  y = nextFreeYInColumn(layout, x, w, y, h, layout.contentBottom);

  if (y + h > layout.contentBottom) {
    // Keep the working out in one column and grow the board downward. A second
    // column starting back at the top reads out of order to a student.
    const grown = y + h + TEXT_GAP;
    if (grown > layout.sectionOffsetY + MAX_SECTION_HEIGHT) return null;
    layout.contentBottom = grown;
  }

  reserve(layout, { id, x, y, w, h, kind: "content" });
  layout.contentCursorY = Math.max(layout.contentCursorY, y + h + TEXT_GAP);
  return { x, y };
}

/**
 * Scan occupied list: for anything overlapping this column horizontally,
 * move y to bottom + TEXT_GAP. Repeat until free or out of room.
 */
export function nextFreeYInColumn(
  layout: BoardLayout,
  x: number,
  w: number,
  startY: number,
  h: number,
  contentBottom = CONTENT_BOTTOM,
): number {
  let y = startY;
  for (let guard = 0; guard < 40; guard++) {
    let blockedBy: OccupiedRect | null = null;
    for (const o of layout.occupied) {
      if (o.kind === "footer" || o.kind === "chip") continue;
      // Same column if horizontal ranges overlap (with pad).
      const horizOverlap = !(
        x + w + LAYOUT_PAD <= o.x ||
        o.x + o.w + LAYOUT_PAD <= x
      );
      if (!horizOverlap) continue;
      const candidate = { x, y, w, h };
      if (rectsIntersect(candidate, o, LAYOUT_PAD)) {
        if (!blockedBy || o.y + o.h > blockedBy.y + blockedBy.h) {
          blockedBy = o;
        }
      }
    }
    if (!blockedBy) return y;
    y = blockedBy.y + blockedBy.h + TEXT_GAP;
    if (y + h > contentBottom) return y;
  }
  return y;
}

/** Estimate pixel size for wrapped board text. */
export function measureTextBlock(
  lines: string[],
  fontSize: number,
  lineHeight = fontSize + 8,
): { w: number; h: number } {
  const charW = fontSize * 0.55;
  const w = Math.min(
    720,
    Math.max(40, ...lines.map((l) => Math.ceil(24 + l.length * charW))),
  );
  const h = Math.max(lineHeight, lines.length * lineHeight + 4);
  return { w, h };
}

/**
 * Reserve the right illustration band so text never lands on drawings/images.
 */
export function reserveIllustrationBand(
  layout: BoardLayout,
  id = "illustration-band",
): OccupiedRect {
  const rect: OccupiedRect = {
    id,
    x: 520,
    y: layout.sectionOffsetY + 80,
    w: 350,
    h: 400,
    kind: "content",
  };
  reserve(layout, rect);
  return rect;
}

/** Lowest Y occupied by content (for stacking follow-up sections). */
export function layoutExtentY(layout: BoardLayout): number {
  let max = layout.sectionOffsetY + DRAW_CANVAS_HEIGHT;
  for (const o of layout.occupied) {
    max = Math.max(max, o.y + o.h + SECTION_GAP);
  }
  max = Math.max(max, layout.contentCursorY + SECTION_GAP);
  return max;
}

/**
 * Footer chip slot (0..2). Blanks the slot then draws the new chip.
 * Returns draw commands (blank + rect + text).
 */
export function footerChipCommands(input: {
  layout: BoardLayout;
  beatOrder: number;
  beatId: string;
  t0Base: number;
  text: string;
}): DrawCommand[] {
  const { layout, beatOrder, beatId, t0Base } = input;
  const slot = ((Math.max(1, beatOrder) - 1) % 3) as 0 | 1 | 2;
  const x = FOOTER_SLOT_X[slot];
  // Stay under the working out, which can push past the default footer line.
  const y = Math.max(
    layout.sectionOffsetY + FOOTER_Y,
    layout.contentBottom + LAYOUT_PAD,
  );
  const w = FOOTER_SLOT_W;
  const h = FOOTER_H;

  const chipText = shortenChip(input.text);
  if (!chipText) return [];

  const slotKey = `footer-slot-${slot}`;
  release(layout, slotKey);
  reserve(layout, {
    id: slotKey,
    x,
    y,
    w,
    h,
    kind: "chip",
  });
  layout.footerSlots[slot] = beatId;

  const prefix = `${beatId}-chip`;
  return [
    // Opaque blank so prior chip text in this slot cannot show through.
    {
      id: `${prefix}-blank`,
      type: "rect",
      t0: t0Base,
      durationMs: 80,
      x: x - 2,
      y: y - 2,
      w: w + 4,
      h: h + 4,
      color: BOARD_BG,
      width: 1,
      fill: BOARD_BG,
    },
    {
      id: `${prefix}-box`,
      type: "rect",
      t0: t0Base + 40,
      durationMs: 350,
      x,
      y,
      w: Math.min(w, 28 + chipText.length * 10),
      h,
      color: "#1b6ca8",
      width: 1.5,
      fill: "rgba(27,108,168,0.08)",
    },
    {
      id: `${prefix}-text`,
      type: "text",
      t0: t0Base + 80,
      durationMs: 400,
      text: chipText,
      x: x + 10,
      y: y + 12,
      color: "#1a2b3c",
      fontSize: 14,
    },
  ];
}

export function shortenChip(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const words = cleaned.split(/\s+/).slice(0, 3);
  let out = words.join(" ");
  if (out.length > 22) out = out.slice(0, 22).trim();
  return out.length >= 2 ? out : "";
}

/**
 * Register UML class boxes + edge labels into the occupancy map.
 */
export function registerUmlOccupancy(
  layout: BoardLayout,
  boxes: Array<{ id: string; x: number; y: number; w: number; h: number }>,
  labels: Array<{ id: string; x: number; y: number; w: number; h: number }>,
): void {
  for (const b of boxes) {
    reserve(layout, { ...b, kind: "uml" });
  }
  for (const l of labels) {
    reserve(layout, { ...l, kind: "label" });
  }
  const maxBottom = boxes.reduce((m, b) => Math.max(m, b.y + b.h), CONTENT_TOP);
  layout.contentCursorY = Math.max(layout.contentCursorY, maxBottom + 16);
}

/**
 * Estimate AABBs from draw commands and ensure no text/rect pairs collide.
 * Ignores intentional pairs: blanks, text-inside-own-box, footer slot replacements.
 */
export function findCommandOverlaps(
  commands: DrawCommand[],
  pad = LAYOUT_PAD,
): Array<[string, string]> {
  const boxes: OccupiedRect[] = [];
  for (const cmd of commands) {
    const box = commandBounds(cmd);
    if (box) boxes.push(box);
  }
  const hits: Array<[string, string]> = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      if (shouldIgnoreOverlap(a, b)) continue;
      if (rectsIntersect(a, b, pad)) hits.push([a.id, b.id]);
    }
  }
  return hits;
}

function shouldIgnoreOverlap(a: OccupiedRect, b: OccupiedRect): boolean {
  if (a.id.includes("-blank") || b.id.includes("-blank")) return true;
  // Footer chip slot replacement — same band, intentional overwrite via blank.
  if (a.kind === "chip" && b.kind === "chip") return true;
  // Text/rows drawn inside their class/chip box.
  if (isNestedLabel(a, b) || isNestedLabel(b, a)) return true;
  // Stacked rows inside one class (name vs attribute lines).
  if (sameDrawableFamily(a.id, b.id)) return true;
  // Title band vs content that starts just below.
  if (
    (a.kind === "title" || b.kind === "title") &&
    Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) < 20
  ) {
    return true;
  }
  return false;
}

function sameDrawableFamily(aId: string, bId: string): boolean {
  const parent = (id: string) => id.replace(/-[^-]+$/, "");
  const pa = parent(aId);
  const pb = parent(bId);
  // Wrapped lines share a prefix (bb1 / bb1-l1, script-s1 / script-s1-n1).
  if (pa.length >= 2 && pa === pb) return true;
  if (aId.startsWith(bId + "-") || bId.startsWith(aId + "-")) return true;
  return false;
}

function isNestedLabel(outer: OccupiedRect, inner: OccupiedRect): boolean {
  if (outer.kind === "chip" && inner.kind === "chip") {
    return sameChipPair(outer.id, inner.id);
  }
  // e.g. u1-c1-box contains u1-c1-name / u1-c1-r0
  const outerBase = outer.id.replace(/-box$/, "");
  if (
    outer.id.endsWith("-box") &&
    (inner.id.startsWith(outerBase + "-") || inner.id === outerBase)
  ) {
    return (
      inner.x >= outer.x - 4 &&
      inner.y >= outer.y - 4 &&
      inner.x + inner.w <= outer.x + outer.w + 4 &&
      inner.y + inner.h <= outer.y + outer.h + 4
    );
  }
  return false;
}

function sameChipPair(a: string, b: string): boolean {
  const strip = (s: string) => s.replace(/-box$|-text$|-blank$/, "");
  return strip(a) === strip(b);
}

function commandBounds(cmd: DrawCommand): OccupiedRect | null {
  switch (cmd.type) {
    case "rect":
      return {
        id: cmd.id,
        x: cmd.x,
        y: cmd.y,
        w: cmd.w,
        h: cmd.h,
        kind: cmd.id.includes("chip") ? "chip" : "content",
      };
    case "image":
      return {
        id: cmd.id,
        x: cmd.x,
        y: cmd.y,
        w: cmd.w,
        h: cmd.h,
        kind: "content",
      };
    case "text": {
      const font = cmd.fontSize ?? 16;
      const w = Math.min(720, Math.max(24, cmd.text.length * font * 0.55));
      const h = font + 8;
      return {
        id: cmd.id,
        x: cmd.x,
        y: cmd.y,
        w,
        h,
        kind: cmd.id.includes("chip") ? "chip" : "content",
      };
    }
    case "circle":
      return {
        id: cmd.id,
        x: cmd.x - cmd.radius,
        y: cmd.y - cmd.radius,
        w: cmd.radius * 2,
        h: cmd.radius * 2,
        kind: "content",
      };
    case "highlight":
      return null; // intentional overlay
    default:
      return null;
  }
}

/**
 * Drop secondary chip commands that still collide after placement.
 */
export function dropCollidingChips(commands: DrawCommand[]): DrawCommand[] {
  const overlaps = findCommandOverlaps(commands);
  if (!overlaps.length) return commands;
  const drop = new Set<string>();
  for (const [a, b] of overlaps) {
    const chipId = [a, b].find((id) => id.includes("-chip"));
    if (chipId) {
      const prefix = chipId.replace(/-blank$|-box$|-text$/, "");
      for (const cmd of commands) {
        if (cmd.id.startsWith(prefix)) drop.add(cmd.id);
      }
    }
  }
  if (!drop.size) return commands;
  return commands.filter((c) => !drop.has(c.id));
}

export function assertNoOverlaps(
  commands: DrawCommand[],
  label = "draw",
): void {
  const hits = findCommandOverlaps(commands);
  if (!hits.length) return;
  // Soft assert: log in server; callers may drop chips.
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[boardLayout] overlap in ${label}:`,
      hits
        .slice(0, 5)
        .map(([a, b]) => `${a}∩${b}`)
        .join(", "),
    );
  }
}

/** Canvas size helpers for tests. */
export function canvasSize() {
  return { width: DRAW_CANVAS_WIDTH, height: DRAW_CANVAS_HEIGHT };
}
