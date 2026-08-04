"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Circle, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import type { DrawCommand } from "@/lib/draw-engine/commands";
import {
  DRAW_CANVAS_HEIGHT,
  DRAW_CANVAS_WIDTH,
} from "@/lib/draw-engine/commands";
import {
  DrawCommandQueue,
  resolveDrawablesAt,
  type DrawablePrimitive,
} from "@/lib/draw-engine/resolve";

type KonvaDrawStageProps = {
  queue: DrawCommandQueue;
  /** Bump to reset the animation clock (e.g. on each new stream session). */
  sessionKey?: number | string;
  /** External clock in ms. If omitted, uses wall clock from session start. */
  clockMs?: number | null;
  playing?: boolean;
  className?: string;
  onClock?: (ms: number) => void;
  /** Logical canvas height (grows for stacked follow-up sections). */
  canvasHeight?: number;
  /** Scroll so this logical Y is near the top of the viewport. */
  scrollToY?: number | null;
};

/**
 * Client render engine: AI is only a planner — this layer owns animation.
 */
export function KonvaDrawStage({
  queue,
  sessionKey = 0,
  clockMs = null,
  playing = true,
  className,
  onClock,
  canvasHeight = DRAW_CANVAS_HEIGHT,
  scrollToY = null,
}: KonvaDrawStageProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 640, height: 420 });
  const [tick, setTick] = useState(0);
  const [drawables, setDrawables] = useState<DrawablePrimitive[]>([]);
  const originRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  const logicalHeight = Math.max(DRAW_CANVAS_HEIGHT, canvasHeight);

  useEffect(() => {
    originRef.current = null;
    // A new session intentionally clears primitives from the previous timeline.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawables([]);
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

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const loop = (now: number) => {
      if (originRef.current == null) originRef.current = now;
      const external = clockMs;
      const ms =
        external != null ? external : now - (originRef.current ?? now);
      onClock?.(ms);
      setDrawables(resolveDrawablesAt(queue.getAll(), ms));
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, clockMs, queue, onClock, tick, sessionKey]);

  // Fit width; allow vertical scroll for taller stacked boards.
  const scale = useMemo(() => {
    return size.width / DRAW_CANVAS_WIDTH;
  }, [size.width]);

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
        "h-full min-h-[420px] w-full overflow-auto rounded-2xl border border-board-edge bg-white"
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
          </Layer>
        </Stage>
      </div>
    </div>
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
