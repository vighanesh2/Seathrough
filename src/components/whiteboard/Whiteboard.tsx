"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayableStroke } from "@/lib/automatic-drawing/strokePlan";
import { scalePlayableToCanvas } from "@/lib/automatic-drawing/strokePlan";

export type WhiteboardTool = "pen" | "eraser";

export type WhiteboardHandle = {
  clear: () => void;
  undo: () => void;
  exportPng: () => string | null;
  canUndo: () => boolean;
  getSize: () => { width: number; height: number };
  playStrokes: (
    strokes: PlayableStroke[],
    planSize: { width: number; height: number },
  ) => Promise<void>;
  stopPlayback: () => void;
};

type Stroke = {
  tool: WhiteboardTool;
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
  fill?: boolean;
  text?: { content: string; fontSize: number };
};

type WhiteboardProps = {
  tool: WhiteboardTool;
  color: string;
  width: number;
  locked?: boolean;
  onReady?: (handle: WhiteboardHandle) => void;
  onHistoryChange?: (canUndo: boolean) => void;
};

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  dpr: number,
) {
  ctx.save();
  if (stroke.text) {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = stroke.color;
    ctx.font = `${stroke.text.fontSize * dpr}px Lexend, sans-serif`;
    ctx.textBaseline = "top";
    const p = stroke.points[0];
    if (p) ctx.fillText(stroke.text.content, p.x * dpr, p.y * dpr);
    ctx.restore();
    return;
  }

  if (stroke.points.length < 2) {
    ctx.restore();
    return;
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.width * dpr;
  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
  }
  ctx.beginPath();
  ctx.moveTo(stroke.points[0]!.x * dpr, stroke.points[0]!.y * dpr);
  for (let i = 1; i < stroke.points.length; i += 1) {
    ctx.lineTo(stroke.points[i]!.x * dpr, stroke.points[i]!.y * dpr);
  }
  if (stroke.fill) {
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.stroke();
  }
  ctx.restore();
}

function paintBoard(
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  dpr: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(27, 108, 168, 0.08)";
  ctx.lineWidth = 1;
  const step = 28 * dpr;
  for (let x = step; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = step; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  for (const stroke of strokes) {
    drawStroke(ctx, stroke, dpr);
  }
}

function slicePoints(
  points: Array<{ x: number; y: number }>,
  progress: number,
): Array<{ x: number; y: number }> {
  if (points.length <= 1) return points;
  const t = Math.max(0, Math.min(1, progress));
  if (t >= 1) return points;
  const segments = points.length - 1;
  const exact = t * segments;
  const full = Math.floor(exact);
  const frac = exact - full;
  const out = points.slice(0, full + 1);
  if (full < segments && frac > 0) {
    const a = points[full]!;
    const b = points[full + 1]!;
    out.push({
      x: a.x + (b.x - a.x) * frac,
      y: a.y + (b.y - a.y) * frac,
    });
  }
  return out;
}

export function Whiteboard({
  tool,
  color,
  width,
  locked = false,
  onReady,
  onHistoryChange,
}: WhiteboardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const dprRef = useRef(1);
  const sizeRef = useRef({ width: 0, height: 0 });
  const playEpochRef = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintBoard(canvas, strokesRef.current, dprRef.current);
  }, []);

  const notifyHistory = useCallback(() => {
    onHistoryChange?.(strokesRef.current.length > 0);
  }, [onHistoryChange]);

  const stopPlayback = useCallback(() => {
    playEpochRef.current += 1;
  }, []);

  const clear = useCallback(() => {
    stopPlayback();
    strokesRef.current = [];
    redraw();
    notifyHistory();
  }, [redraw, notifyHistory, stopPlayback]);

  const undo = useCallback(() => {
    stopPlayback();
    strokesRef.current = strokesRef.current.slice(0, -1);
    redraw();
    notifyHistory();
  }, [redraw, notifyHistory, stopPlayback]);

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  }, []);

  const getSize = useCallback(() => sizeRef.current, []);

  const playStrokes = useCallback(
    async (
      strokes: PlayableStroke[],
      planSize: { width: number; height: number },
    ) => {
      const epoch = ++playEpochRef.current;
      const { width: cw, height: ch } = sizeRef.current;
      if (cw < 1 || ch < 1 || !strokes.length) return;

      const scaled = scalePlayableToCanvas(
        strokes,
        planSize.width,
        planSize.height,
        cw,
        ch,
      );

      const committed: Stroke[] = [];
      strokesRef.current = [];
      redraw();

      for (const src of scaled) {
        if (epoch !== playEpochRef.current) return;

        if (src.text) {
          committed.push({
            tool: "pen",
            color: src.color,
            width: src.width,
            points: src.points,
            text: src.text,
          });
          strokesRef.current = [...committed];
          redraw();
          await new Promise((r) => setTimeout(r, 160));
          continue;
        }

        if (src.fill) {
          // Fills appear quickly so outlines can animate over them.
          committed.push({
            tool: "pen",
            color: src.color,
            width: src.width,
            points: src.points,
            fill: true,
          });
          strokesRef.current = [...committed];
          redraw();
          await new Promise((r) => setTimeout(r, 40));
          continue;
        }

        const duration = Math.min(1800, Math.max(280, src.points.length * 22));
        const start = performance.now();

        await new Promise<void>((resolve) => {
          const tick = (now: number) => {
            if (epoch !== playEpochRef.current) {
              resolve();
              return;
            }
            const t = Math.min(1, (now - start) / duration);
            strokesRef.current = [
              ...committed,
              {
                tool: "pen",
                color: src.color,
                width: src.width,
                points: slicePoints(src.points, t),
              },
            ];
            redraw();
            if (t >= 1) {
              committed.push({
                tool: "pen",
                color: src.color,
                width: src.width,
                points: src.points,
              });
              strokesRef.current = [...committed];
              redraw();
              resolve();
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      }

      notifyHistory();
    },
    [redraw, notifyHistory],
  );

  useEffect(() => {
    onReady?.({
      clear,
      undo,
      exportPng,
      canUndo: () => strokesRef.current.length > 0,
      getSize,
      playStrokes,
      stopPlayback,
    });
  }, [
    onReady,
    clear,
    undo,
    exportPng,
    getSize,
    playStrokes,
    stopPlayback,
  ]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const sync = () => {
      const rect = el.getBoundingClientRect();
      const next = {
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      };
      sizeRef.current = next;
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width < 1 || size.height < 1) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    dprRef.current = dpr;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    redraw();
  }, [size, redraw]);

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (locked) return;
    stopPlayback();
    const pos = pointerPos(e);
    if (!pos) return;
    drawingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    strokesRef.current = [
      ...strokesRef.current,
      {
        tool,
        color,
        width: tool === "eraser" ? Math.max(12, width * 3) : width,
        points: [pos],
      },
    ];
    redraw();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (locked || !drawingRef.current) return;
    const pos = pointerPos(e);
    if (!pos) return;
    const current = strokesRef.current[strokesRef.current.length - 1];
    if (!current || current.text) return;
    current.points.push(pos);
    redraw();
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    notifyHistory();
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[480px] w-full overflow-hidden rounded-2xl border border-board-edge bg-chalk shadow-[var(--shadow-board)]"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        style={{
          cursor: locked ? "wait" : tool === "eraser" ? "cell" : "crosshair",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
}
