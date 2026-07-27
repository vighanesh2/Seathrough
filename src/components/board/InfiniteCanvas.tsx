"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";

type InfiniteCanvasProps = {
  children: ReactNode;
  /** Reset pan/zoom when this changes (new lesson visual) */
  resetKey?: string | number;
  className?: string;
};

/**
 * Pan + zoom surface so lesson figures grow into space instead of scrolling.
 */
export function InfiniteCanvas({
  children,
  resetKey,
  className = "",
}: InfiniteCanvasProps) {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const spacePan = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, [resetKey]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        spacePan.current = true;
        if (viewportRef.current) viewportRef.current.style.cursor = "grab";
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePan.current = false;
        if (viewportRef.current && !dragging.current) {
          viewportRef.current.style.cursor = "default";
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Non-passive wheel so we can prevent page scroll while zooming
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setTransform((prev) => {
        const zoomFactor = Math.exp(-e.deltaY * 0.0015);
        const nextScale = Math.min(2.75, Math.max(0.35, prev.scale * zoomFactor));
        const ratio = nextScale / prev.scale;
        return {
          scale: nextScale,
          x: mx - (mx - prev.x) * ratio,
          y: my - (my - prev.y) * ratio,
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.button === 2 || spacePan.current || e.altKey) {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.style.cursor = "grabbing";
      e.preventDefault();
    }
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.style.cursor = spacePan.current ? "grab" : "default";
  }, []);

  return (
    <div
      ref={viewportRef}
      className={`board-surface relative h-full w-full overflow-hidden touch-none ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Infinite lesson canvas"
    >
      <div
        className="absolute left-1/2 top-1/2 will-change-transform"
        style={{
          transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "center center",
        }}
      >
        <div className="flex min-w-[min(720px,86vw)] flex-col items-center justify-center gap-6 px-8 py-10">
          {children}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-chalk/90 px-2.5 py-1.5 font-sans text-[11px] text-muted shadow-sm backdrop-blur-sm">
        Scroll to zoom · Space+drag or right-drag to pan
      </div>
    </div>
  );
}
