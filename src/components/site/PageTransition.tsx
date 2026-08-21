"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Thin top progress + content fade on route change (Perplexity-like).
 * Uses the View Transitions API when available; falls back to CSS enter.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;

    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];

    setVisible(true);
    setProgress(12);

    timers.current.push(
      window.setTimeout(() => setProgress(55), 80),
      window.setTimeout(() => setProgress(82), 220),
      window.setTimeout(() => setProgress(100), 420),
      window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 560),
    );

    return () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
    };
  }, [pathname]);

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-100 h-[2px] transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      >
        <div
          className="h-full origin-left bg-linear-to-r from-[#1b6ca8] via-[#4a9fd4] to-[#1b6ca8] shadow-[0_0_12px_rgba(27,108,168,0.45)] transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div key={pathname} className="page-enter flex min-h-0 min-w-0 flex-1 flex-col">
        {children}
      </div>
    </>
  );
}
