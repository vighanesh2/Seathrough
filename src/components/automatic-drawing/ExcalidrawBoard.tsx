"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LibraryElement } from "@/lib/automatic-drawing/library";
import {
  absolutePoints,
  diamondPoints,
  fillFor,
  pointsToPath,
  sceneBounds,
  strokeFor,
  strokeWidthFor,
} from "@/lib/automatic-drawing/renderElement";
import type { RevealBatch } from "@/lib/automatic-drawing/schema";

export type ExcalidrawBoardHandle = {
  exportPng: () => Promise<Blob | null>;
  clearScene: () => void;
};

type ExcalidrawBoardProps = {
  batches: RevealBatch[] | null;
  replayKey?: number;
  onReady?: (handle: ExcalidrawBoardHandle) => void;
  onRevealDone?: () => void;
  onRevealing?: (active: boolean) => void;
};

type PenStroke = {
  id: string;
  points: Array<[number, number]>;
};

function ExcalidrawElementView({ el }: { el: LibraryElement }) {
  if (el.isDeleted) return null;
  const type = String(el.type ?? "");
  const opacity = Math.max(0.15, numOpacity(el.opacity));
  const stroke = strokeFor(el);
  const fill = fillFor(el);
  const sw = strokeWidthFor(el);
  const x = Number(el.x) || 0;
  const y = Number(el.y) || 0;
  const w = Number(el.width) || 0;
  const h = Number(el.height) || 0;
  const angle = Number(el.angle) || 0;
  const transform =
    angle !== 0
      ? `rotate(${(angle * 180) / Math.PI} ${x + w / 2} ${y + h / 2})`
      : undefined;

  if (type === "text") {
    const text = String(el.text ?? "");
    const fontSize = Number(el.fontSize) || 16;
    return (
      <text
        x={x}
        y={y + fontSize}
        fill={stroke}
        fontSize={fontSize}
        fontFamily="Lexend, sans-serif"
        opacity={opacity}
        style={{ whiteSpace: "pre" }}
      >
        {text}
      </text>
    );
  }

  if (type === "rectangle" || type === "image" || type === "frame") {
    const radius = Number((el as { roundness?: { type?: number } }).roundness ? 8 : 0);
    return (
      <rect
        x={x}
        y={y}
        width={Math.max(1, w)}
        height={Math.max(1, h)}
        rx={radius}
        ry={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        opacity={opacity}
        transform={transform}
      />
    );
  }

  if (type === "ellipse") {
    return (
      <ellipse
        cx={x + w / 2}
        cy={y + h / 2}
        rx={Math.max(1, w / 2)}
        ry={Math.max(1, h / 2)}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        opacity={opacity}
        transform={transform}
      />
    );
  }

  if (type === "diamond") {
    const pts = diamondPoints(x, y, w, h)
      .map(([px, py]) => `${px},${py}`)
      .join(" ");
    return (
      <polygon
        points={pts}
        fill={fill}
        stroke={stroke}
        strokeWidth={sw}
        opacity={opacity}
        transform={transform}
      />
    );
  }

  if (
    type === "line" ||
    type === "draw" ||
    type === "freedraw" ||
    type === "arrow"
  ) {
    const pts = absolutePoints(el);
    const closed = Boolean(el.closed) || pts.length > 2 && near(pts[0]!, pts[pts.length - 1]!);
    const d = pointsToPath(pts, closed && type !== "arrow");
    if (!d) return null;
    return (
      <path
        d={d}
        fill={closed ? fill : "none"}
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
    );
  }

  // Fallback: bounding box so unknown shapes still appear
  if (w > 0 && h > 0) {
    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeDasharray="4 3"
        opacity={opacity * 0.7}
      />
    );
  }
  return null;
}

function numOpacity(value: unknown): number {
  const n = typeof value === "number" ? value : 100;
  return Math.min(1, Math.max(0, n / 100));
}

function near(a: [number, number], b: [number, number], eps = 1.5): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < eps;
}

export function ExcalidrawBoard({
  batches,
  replayKey = 0,
  onReady,
  onRevealDone,
  onRevealing,
}: ExcalidrawBoardProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [penEnabled, setPenEnabled] = useState(false);
  const [penStrokes, setPenStrokes] = useState<PenStroke[]>([]);
  const drawingRef = useRef(false);
  const currentPenId = useRef<string | null>(null);
  const revealEpoch = useRef(0);

  const clearScene = useCallback(() => {
    setVisibleCount(0);
    setPenStrokes([]);
    setPenEnabled(false);
  }, []);

  const exportPng = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg) return null;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("PNG export failed"));
        image.src = url;
      });
      const canvas = document.createElement("canvas");
      const vb = svg.viewBox.baseVal;
      canvas.width = Math.max(1, Math.round(vb.width || 900));
      canvas.height = Math.max(1, Math.round(vb.height || 600));
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  useEffect(() => {
    onReady?.({
      exportPng,
      clearScene,
    });
  }, [onReady, exportPng, clearScene]);

  useEffect(() => {
    const epoch = ++revealEpoch.current;
    // A new reveal sequence must synchronously discard the previous pen state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPenStrokes([]);
    setPenEnabled(false);

    if (!batches?.length) {
      setVisibleCount(0);
      onRevealing?.(false);
      return;
    }

    setVisibleCount(0);
    onRevealing?.(true);

    let cancelled = false;
    let index = 0;
    let raf = 0;
    let last = 0;
    const STEP_MS = 420;

    const tick = (now: number) => {
      if (cancelled || epoch !== revealEpoch.current) return;
      if (!last) last = now;
      if (now - last >= STEP_MS) {
        last = now;
        index += 1;
        setVisibleCount(index);
        if (index >= batches.length) {
          onRevealing?.(false);
          onRevealDone?.();
          setPenEnabled(true);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [batches, replayKey, onRevealDone, onRevealing]);

  const visibleElements = useMemo(() => {
    if (!batches?.length) return [] as LibraryElement[];
    return batches.slice(0, visibleCount).flatMap((b) => b.elements);
  }, [batches, visibleCount]);

  const bounds = useMemo(
    () => sceneBounds(visibleElements.length ? visibleElements : [], 48),
    [visibleElements],
  );

  function toScenePoint(clientX: number, clientY: number): [number, number] | null {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    return [local.x, local.y];
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!penEnabled) return;
    const p = toScenePoint(e.clientX, e.clientY);
    if (!p) return;
    drawingRef.current = true;
    const id = `pen-${Date.now()}`;
    currentPenId.current = id;
    setPenStrokes((prev) => [...prev, { id, points: [p] }]);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawingRef.current || !currentPenId.current) return;
    const p = toScenePoint(e.clientX, e.clientY);
    if (!p) return;
    const id = currentPenId.current;
    setPenStrokes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, points: [...s.points, p] } : s)),
    );
  }

  function onPointerUp() {
    drawingRef.current = false;
    currentPenId.current = null;
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-board-edge bg-chalk shadow-[var(--shadow-board)]"
      style={{ height: "100%", minHeight: 480 }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
        className="h-full w-full touch-none bg-white"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ cursor: penEnabled ? "crosshair" : "default" }}
      >
        <rect
          x={bounds.minX}
          y={bounds.minY}
          width={bounds.width}
          height={bounds.height}
          fill="#ffffff"
        />
        {visibleElements.map((el) => (
          <ExcalidrawElementView key={String(el.id)} el={el} />
        ))}
        {penStrokes.map((stroke) =>
          stroke.points.length >= 2 ? (
            <path
              key={stroke.id}
              d={pointsToPath(stroke.points)}
              fill="none"
              stroke="#1a2b3c"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null,
        )}
      </svg>
      {!batches?.length ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="font-sans text-sm text-muted">
            Describe a diagram above, then hit Draw.
          </p>
        </div>
      ) : null}
      {penEnabled ? (
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-chalk/90 px-2 py-1 font-sans text-[11px] text-muted">
          Pen ready — draw on the board
        </p>
      ) : null}
    </div>
  );
}
