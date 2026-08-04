import type { DrawCommand, StrokeCommand } from "@/lib/draw-engine/commands";

export type Point = { x: number; y: number };

export type DrawablePrimitive =
  | {
      kind: "line";
      id: string;
      points: number[]; // flat [x,y,...] for Konva
      color: string;
      width: number;
      closed?: boolean;
      opacity: number;
    }
  | {
      kind: "arrow";
      id: string;
      points: number[];
      color: string;
      width: number;
      opacity: number;
    }
  | {
      kind: "rect";
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      width: number;
      fill?: string;
      opacity: number;
    }
  | {
      kind: "circle";
      id: string;
      x: number;
      y: number;
      radius: number;
      color: string;
      width: number;
      fill?: string;
      opacity: number;
    }
  | {
      kind: "text";
      id: string;
      text: string;
      x: number;
      y: number;
      color: string;
      fontSize: number;
      opacity: number;
    }
  | {
      kind: "image";
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      src: string;
      opacity: number;
    }
  | {
      kind: "highlight";
      id: string;
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      opacity: number;
    };

function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/** Deterministic wobble for a hand-drawn feel. */
export function jitterPoint(
  p: Point,
  seed: string,
  amount: number,
  index: number,
): Point {
  if (amount <= 0) return p;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= index * 2654435761;
  const n1 = Math.sin(h * 0.0001) * amount;
  const n2 = Math.cos(h * 0.00013 + index) * amount;
  return { x: p.x + n1, y: p.y + n2 };
}

function strokeProgressPoints(
  cmd: StrokeCommand,
  progress: number,
): Point[] {
  const pts = cmd.points;
  if (pts.length === 0) return [];
  if (progress <= 0) return [pts[0]!];
  if (progress >= 1) {
    return pts.map((p, i) =>
      jitterPoint(p, cmd.id, cmd.jitter ?? 0.8, i),
    );
  }

  const totalSeg = pts.length - 1;
  const exact = progress * totalSeg;
  const i = Math.floor(exact);
  const frac = exact - i;
  const out: Point[] = [];
  for (let k = 0; k <= i; k += 1) {
    out.push(jitterPoint(pts[k]!, cmd.id, cmd.jitter ?? 0.8, k));
  }
  const a = pts[i]!;
  const b = pts[Math.min(i + 1, pts.length - 1)]!;
  out.push(
    jitterPoint(
      { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac },
      cmd.id,
      cmd.jitter ?? 0.8,
      i + 1,
    ),
  );
  return out;
}

function flat(points: Point[]): number[] {
  const out: number[] = [];
  for (const p of points) out.push(p.x, p.y);
  return out;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Resolve the visible drawable set at clock time `nowMs`.
 * Commands with t0 > nowMs are ignored; clear resets prior shapes.
 */
export function resolveDrawablesAt(
  commands: DrawCommand[],
  nowMs: number,
): DrawablePrimitive[] {
  const sorted = [...commands].sort((a, b) => {
    if (a.t0 !== b.t0) return a.t0 - b.t0;
    return a.id.localeCompare(b.id);
  });

  let clearAfter = -1;
  for (const cmd of sorted) {
    if (cmd.type === "clear" && cmd.t0 <= nowMs) {
      clearAfter = cmd.t0;
    }
  }

  const active = sorted.filter((c) => {
    if (c.t0 > nowMs) return false;
    if (c.type === "pause" || c.type === "clear") return false;
    if (clearAfter >= 0 && c.t0 < clearAfter) return false;
    return true;
  });

  // Later commands with the same id replace earlier ones (follow-ups often
  // reuse beat1 / beat2 ids). Keeps React keys and the scene unique.
  const byId = new Map<string, (typeof active)[number]>();
  for (const c of active) {
    byId.set(c.id, c);
  }
  const unique = [...byId.values()].sort((a, b) => {
    if (a.t0 !== b.t0) return a.t0 - b.t0;
    return a.id.localeCompare(b.id);
  });

  const out: DrawablePrimitive[] = [];

  for (const cmd of unique) {
    const dur = Math.max(1, cmd.durationMs || 1);
    const raw = clamp01((nowMs - cmd.t0) / dur);
    const p = easeOutCubic(raw);
    const opacity = Math.min(1, 0.25 + p * 0.75);

    switch (cmd.type) {
      case "stroke": {
        const pts = strokeProgressPoints(cmd, raw);
        if (pts.length < 2) break;
        out.push({
          kind: "line",
          id: cmd.id,
          points: flat(pts),
          color: cmd.color ?? "#1a2b3c",
          width: cmd.width,
          closed: cmd.closed && raw >= 1,
          opacity,
        });
        break;
      }
      case "line": {
        out.push({
          kind: "line",
          id: cmd.id,
          points: [
            cmd.x1,
            cmd.y1,
            lerp(cmd.x1, cmd.x2, p),
            lerp(cmd.y1, cmd.y2, p),
          ],
          color: cmd.color ?? "#1a2b3c",
          width: cmd.width,
          opacity,
        });
        break;
      }
      case "arrow": {
        out.push({
          kind: "arrow",
          id: cmd.id,
          points: [
            cmd.x1,
            cmd.y1,
            lerp(cmd.x1, cmd.x2, p),
            lerp(cmd.y1, cmd.y2, p),
          ],
          color: cmd.color ?? "#1b6ca8",
          width: cmd.width,
          opacity,
        });
        break;
      }
      case "rect": {
        out.push({
          kind: "rect",
          id: cmd.id,
          x: cmd.x,
          y: cmd.y,
          w: cmd.w * p,
          h: cmd.h * p,
          color: cmd.color ?? "#1a2b3c",
          width: cmd.width,
          fill: cmd.fill,
          opacity,
        });
        break;
      }
      case "circle": {
        out.push({
          kind: "circle",
          id: cmd.id,
          x: cmd.x,
          y: cmd.y,
          radius: cmd.radius * p,
          color: cmd.color ?? "#1a2b3c",
          width: cmd.width,
          fill: cmd.fill,
          opacity,
        });
        break;
      }
      case "text": {
        out.push({
          kind: "text",
          id: cmd.id,
          text: cmd.text,
          x: cmd.x,
          y: cmd.y,
          color: cmd.color ?? "#1a2b3c",
          fontSize: cmd.fontSize,
          opacity: p,
        });
        break;
      }
      case "image": {
        out.push({
          kind: "image",
          id: cmd.id,
          x: cmd.x,
          y: cmd.y,
          w: cmd.w,
          h: cmd.h,
          src: cmd.src,
          opacity: Math.min(1, 0.2 + p * 0.8),
        });
        break;
      }
      case "highlight": {
        out.push({
          kind: "highlight",
          id: cmd.id,
          x: cmd.x,
          y: cmd.y,
          w: cmd.w,
          h: cmd.h,
          color: cmd.color ?? "#f5d76e",
          opacity: 0.15 + 0.25 * p,
        });
        break;
      }
      default:
        break;
    }
  }

  return out;
}

/** Mutable command queue used by the Konva stage. */
export class DrawCommandQueue {
  private commands: DrawCommand[] = [];
  private listeners = new Set<() => void>();

  enqueue(cmd: DrawCommand | DrawCommand[]) {
    const list = Array.isArray(cmd) ? cmd : [cmd];
    this.commands.push(...list);
    this.commands.sort((a, b) => a.t0 - b.t0);
    this.emit();
  }

  clear() {
    this.commands = [];
    this.emit();
  }

  getAll(): DrawCommand[] {
    return this.commands;
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }
}
