"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Circle, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import type { DrawCommand } from "@/lib/draw-engine/commands";
import {
  DRAW_CANVAS_HEIGHT,
  DRAW_CANVAS_WIDTH,
} from "@/lib/draw-engine/commands";
import {
  DrawCommandQueue,
  penPositionAt,
  resolveDrawablesAt,
  type DrawablePrimitive,
} from "@/lib/draw-engine/resolve";

type KonvaDrawStageProps = {
  queue: DrawCommandQueue;
  /** Bump to reset the animation clock (e.g. on each new stream session). */
  sessionKey?: number | string;
  /** External clock in ms. If omitted, uses an internal pause-aware clock. */
  clockMs?: number | null;
  playing?: boolean;
  /** Pen speed multiplier — keeps writing in step with narration pace. */
  speed?: number;
  className?: string;
  onClock?: (ms: number) => void;
  /** Fires once the pen finishes every queued command. */
  onComplete?: () => void;
  /** Show the tutor's hand writing on the board. */
  showPen?: boolean;
  /** Logical canvas height (grows for stacked follow-up sections). */
  canvasHeight?: number;
  /** Scroll so this logical Y is near the top of the viewport. */
  scrollToY?: number | null;
};

function queueEndMs(commands: DrawCommand[]): number {
  let end = 0;
  for (const c of commands) end = Math.max(end, c.t0 + (c.durationMs || 0));
  return end;
}

/**
 * Client render engine: AI is only a planner — this layer owns animation.
 * The clock only advances while playing, so pausing freezes the pen instead of
 * letting wall time run ahead of what the student saw.
 */
export function KonvaDrawStage({
  queue,
  sessionKey = 0,
  clockMs = null,
  playing = true,
  speed = 1,
  className,
  onClock,
  onComplete,
  showPen = true,
  canvasHeight = DRAW_CANVAS_HEIGHT,
  scrollToY = null,
}: KonvaDrawStageProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 640, height: 420 });
  const [tick, setTick] = useState(0);
  const [drawables, setDrawables] = useState<DrawablePrimitive[]>([]);
  const [pen, setPen] = useState<{ x: number; y: number } | null>(null);
  const penRef = useRef<{ x: number; y: number } | null>(null);
  const clockRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const speedRef = useRef(speed);
  const scaleRef = useRef(1);
  const onClockRef = useRef(onClock);
  const onCompleteRef = useRef(onComplete);
  const completedEndRef = useRef<number | null>(null);

  speedRef.current = speed > 0 ? speed : 1;
  onClockRef.current = onClock;
  onCompleteRef.current = onComplete;

  const logicalHeight = Math.max(DRAW_CANVAS_HEIGHT, canvasHeight);

  useEffect(() => {
    clockRef.current = 0;
    lastFrameRef.current = null;
    completedEndRef.current = null;
    penRef.current = null;
    // A new session intentionally clears primitives from the previous timeline.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawables([]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPen(null);
  }, [sessionKey]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({
        width: Math.max(1, Math.floor(width)),
        height: Math.max(1, Math.floor(height)),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return queue.subscribe(() => setTick((t) => t + 1));
  }, [queue]);

  /** Keep the writing point in view as the board grows past one screen. */
  const followPen = useCallback((logicalY: number) => {
    const el = viewportRef.current;
    if (!el || el.scrollHeight <= el.clientHeight) return;
    const y = logicalY * scaleRef.current;
    const margin = 90;
    const top = el.scrollTop;
    const bottom = top + el.clientHeight;
    if (y > bottom - margin) {
      el.scrollTop = Math.max(0, y - el.clientHeight + margin * 1.6);
    } else if (y < top + margin * 0.5) {
      el.scrollTop = Math.max(0, y - margin);
    }
  }, []);

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      // Drop the frame anchor so resuming continues instead of jumping ahead.
      lastFrameRef.current = null;
      return;
    }

    const loop = (now: number) => {
      if (lastFrameRef.current == null) lastFrameRef.current = now;
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;
      clockRef.current += delta * speedRef.current;

      const ms = clockMs != null ? clockMs : clockRef.current;
      onClockRef.current?.(ms);

      const commands = queue.getAll();
      setDrawables(resolveDrawablesAt(commands, ms));

      const target = penPositionAt(commands, ms);
      if (target) {
        // Glide toward the writing point instead of teleporting between steps.
        const prev = penRef.current;
        const next = prev
          ? {
              x: prev.x + (target.x - prev.x) * 0.35,
              y: prev.y + (target.y - prev.y) * 0.35,
            }
          : { x: target.x, y: target.y };
        penRef.current = next;
        setPen(next);
        if (target.writing) followPen(next.y);
      } else if (penRef.current) {
        penRef.current = null;
        setPen(null);
      }

      if (commands.length) {
        const end = queueEndMs(commands);
        if (ms >= end && completedEndRef.current !== end) {
          completedEndRef.current = end;
          onCompleteRef.current?.();
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, clockMs, queue, tick, sessionKey, followPen]);

  // Fit width; allow vertical scroll for taller stacked boards.
  const scale = useMemo(() => {
    return size.width / DRAW_CANVAS_WIDTH;
  }, [size.width]);
  scaleRef.current = scale;

  const stageHeight = Math.max(1, Math.floor(logicalHeight * scale));
  const stageWidth = Math.max(1, Math.floor(DRAW_CANVAS_WIDTH * scale));
  const offsetX = (size.width - stageWidth) / 2;

  useEffect(() => {
    if (scrollToY == null || !viewportRef.current) return;
    const top = Math.max(0, scrollToY * scale - 24);
    viewportRef.current.scrollTo({ top, behavior: "smooth" });
  }, [scrollToY, scale, sessionKey, logicalHeight]);

  const gridCols = Math.ceil(DRAW_CANVAS_WIDTH / 30);
  const gridRows = Math.ceil(logicalHeight / 30);

  return (
    <div
      ref={viewportRef}
      className={
        className ??
        "h-full min-h-[420px] w-full overflow-auto rounded-2xl border border-board-edge bg-chalk"
      }
    >
      <div style={{ width: "100%", height: stageHeight, position: "relative" }}>
        <Stage width={size.width} height={stageHeight}>
          <Layer x={offsetX} y={0} scaleX={scale} scaleY={scale}>
            <Rect
              x={0}
              y={0}
              width={DRAW_CANVAS_WIDTH}
              height={logicalHeight}
              fill="#ffffff"
            />
            {Array.from({ length: gridCols }).map((_, i) => (
              <Line
                key={`vx-${i}`}
                points={[i * 30, 0, i * 30, logicalHeight]}
                stroke="rgba(27,108,168,0.06)"
                strokeWidth={1}
                listening={false}
              />
            ))}
            {Array.from({ length: gridRows }).map((_, i) => (
              <Line
                key={`hy-${i}`}
                points={[0, i * 30, DRAW_CANVAS_WIDTH, i * 30]}
                stroke="rgba(27,108,168,0.06)"
                strokeWidth={1}
                listening={false}
              />
            ))}

            {drawables.map((d) => (
              <DrawableNode key={d.id} d={d} />
            ))}

            {showPen && pen ? <PenCursor x={pen.x} y={pen.y} /> : null}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}

/** The tutor's hand: a marker resting on the board at the writing point. */
function PenCursor({ x, y }: { x: number; y: number }) {
  return (
    <>
      <Circle x={x} y={y} radius={3} fill="#1b6ca8" opacity={0.35} />
      <Line
        points={[x, y, x + 20, y - 34]}
        stroke="#1a2b3c"
        strokeWidth={7}
        lineCap="round"
        opacity={0.9}
      />
      <Line
        points={[x + 20, y - 34, x + 27, y - 46]}
        stroke="#1b6ca8"
        strokeWidth={8}
        lineCap="round"
        opacity={0.95}
      />
      <Line
        points={[x, y, x + 6, y - 10]}
        stroke="#0f4f7c"
        strokeWidth={4}
        lineCap="round"
      />
    </>
  );
}

function DrawableNode({ d }: { d: DrawablePrimitive }) {
  switch (d.kind) {
    case "line":
      return (
        <Line
          points={d.points}
          stroke={d.color}
          strokeWidth={d.width}
          lineCap="round"
          lineJoin="round"
          closed={d.closed}
          opacity={d.opacity}
          tension={0.2}
        />
      );
    case "arrow":
      return (
        <Arrow
          points={d.points}
          stroke={d.color}
          fill={d.color}
          strokeWidth={d.width}
          pointerLength={12}
          pointerWidth={10}
          lineCap="round"
          lineJoin="round"
          opacity={d.opacity}
        />
      );
    case "rect":
      return (
        <Rect
          x={d.x}
          y={d.y}
          width={d.w}
          height={d.h}
          stroke={d.color}
          strokeWidth={d.width}
          fill={d.fill}
          opacity={d.opacity}
          cornerRadius={4}
        />
      );
    case "circle":
      return (
        <Circle
          x={d.x}
          y={d.y}
          radius={d.radius}
          stroke={d.color}
          strokeWidth={d.width}
          fill={d.fill}
          opacity={d.opacity}
        />
      );
    case "text":
      return (
        <Text
          x={d.x}
          y={d.y}
          text={d.text}
          fontSize={d.fontSize}
          fontFamily="Lexend, sans-serif"
          fill={d.color}
          opacity={d.opacity}
        />
      );
    case "image":
      return <BoardImage d={d} />;
    case "highlight":
      return (
        <Rect
          x={d.x}
          y={d.y}
          width={d.w}
          height={d.h}
          fill={d.color}
          opacity={d.opacity}
          cornerRadius={6}
        />
      );
    default:
      return null;
  }
}

function BoardImage({
  d,
}: {
  d: Extract<DrawablePrimitive, { kind: "image" }>;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!cancelled) setImg(image);
    };
    image.onerror = () => {
      if (!cancelled) setImg(null);
    };
    image.src = d.src;
    return () => {
      cancelled = true;
    };
  }, [d.src]);

  if (!img) {
    return (
      <Rect
        x={d.x}
        y={d.y}
        width={d.w}
        height={d.h}
        stroke="rgba(27,108,168,0.35)"
        dash={[6, 4]}
        strokeWidth={1.5}
        opacity={d.opacity}
        cornerRadius={10}
      />
    );
  }

  return (
    <KonvaImage
      image={img}
      x={d.x}
      y={d.y}
      width={d.w}
      height={d.h}
      opacity={d.opacity}
    />
  );
}

/** Re-export for callers that want the logical size. */
export type { DrawCommand };
