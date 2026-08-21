"use client";

import { useEffect, useRef } from "react";
import { buildSceneIframeSrc } from "@/lib/scene-explain/iframeRuntime";
import { SCENE_LOAD_TIMEOUT_MS } from "@/lib/scene-explain/types";

type FrameMessage = {
  source?: string;
  type?: string;
  message?: string;
  maxReveal?: number;
};

type SceneViewportProps = {
  code: string | null;
  frameKey?: number;
  reveal: number;
  onReady: (maxReveal: number) => void;
  onError: (message: string) => void;
};

export function SceneViewport({
  code,
  frameKey = 0,
  reveal,
  onReady,
  onError,
}: SceneViewportProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(onReady);
  const errorRef = useRef(onError);
  const startedRef = useRef(false);
  readyRef.current = onReady;
  errorRef.current = onError;

  useEffect(() => {
    function onMessage(event: MessageEvent<FrameMessage>) {
      const data = event.data;
      if (!data || data.source !== "seethrough-scene") return;
      if (event.origin !== "null" && event.origin !== window.location.origin) {
        return;
      }
      if (data.type === "ready") {
        startedRef.current = true;
        readyRef.current(Math.max(1, Number(data.maxReveal) || 1));
        return;
      }
      if (data.type === "error") {
        errorRef.current(data.message?.trim() || "The 3D scene crashed.");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    startedRef.current = false;
    if (!code) return;
    const timer = window.setTimeout(() => {
      if (!startedRef.current) {
        errorRef.current("The 3D scene did not start in time.");
      }
    }, SCENE_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    const frame = frameRef.current?.contentWindow;
    if (!frame || !code) return;
    frame.postMessage(
      { source: "seethrough-host", type: "reveal", n: reveal },
      "*",
    );
  }, [code, reveal]);

  if (!code) {
    return (
      <div className="grid h-full place-items-center bg-ink font-sans text-sm text-muted">
        Ask for a process — osmosis, an orbit, a cell — and the agent will build it here.
      </div>
    );
  }

  return (
    <iframe
      key={frameKey}
      ref={frameRef}
      title="3D scene"
      sandbox="allow-scripts"
      srcDoc={buildSceneIframeSrc(code)}
      className="h-full w-full border-0 bg-ink"
    />
  );
}
