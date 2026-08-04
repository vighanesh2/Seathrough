"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import type { ExcalidrawBoardHandle } from "@/components/automatic-drawing/ExcalidrawBoard";
import type {
  ExcalidrawScenePlan,
  RevealBatch,
} from "@/lib/automatic-drawing/schema";
import { toUserFacingError } from "@/lib/errors/userFacing";

const ExcalidrawBoard = dynamic(
  () =>
    import("@/components/automatic-drawing/ExcalidrawBoard").then(
      (m) => m.ExcalidrawBoard,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-2xl border border-board-edge bg-chalk text-sm text-muted">
        Loading Excalidraw…
      </div>
    ),
  },
);

type Status = "idle" | "generating" | "drawing" | "ready" | "error";

export function AutomaticDrawingShell() {
  const boardApi = useRef<ExcalidrawBoardHandle | null>(null);
  const [description, setDescription] = useState(
    "A web app: browser talks to an API microservice backed by a database and cache",
  );
  const [plan, setPlan] = useState<ExcalidrawScenePlan | null>(null);
  const [batches, setBatches] = useState<RevealBatch[] | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  const onRevealDone = useCallback(() => {
    setStatus("ready");
  }, []);

  const onBoardReady = useCallback((handle: ExcalidrawBoardHandle) => {
    boardApi.current = handle;
  }, []);

  async function generate() {
    const trimmed = description.trim();
    if (!trimmed) {
      setError("Describe an architecture diagram first.");
      setStatus("error");
      return;
    }

    setError(null);
    setStatus("generating");
    setBatches(null);
    setPlan(null);
    boardApi.current?.clearScene();

    try {
      const res = await fetch("/api/automatic-drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: trimmed }),
      });
      const body = (await res.json()) as {
        plan?: ExcalidrawScenePlan;
        batches?: RevealBatch[];
        error?: string;
      };
      if (!res.ok || !body.plan || !body.batches?.length) {
        throw new Error(body.error || "Could not generate diagram");
      }
      setPlan(body.plan);
      setBatches(body.batches);
      setReplayKey((k) => k + 1);
      setStatus("drawing");
    } catch (err) {
      setStatus("error");
      setError(toUserFacingError(err));
    }
  }

  function replay() {
    if (!batches?.length) return;
    setStatus("drawing");
    setReplayKey((k) => k + 1);
  }

  async function exportPng() {
    const blob = await boardApi.current?.exportPng();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(plan?.title || "architecture")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const busy = status === "generating" || status === "drawing";

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden">
      <header className="z-30 flex shrink-0 flex-wrap items-center gap-3 border-b border-board-edge/80 bg-chalk/90 px-4 py-3 backdrop-blur-md md:px-5">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            Automatic drawing · Excalidraw libraries
          </p>
          <h1 className="truncate font-display text-xl font-semibold text-ink md:text-2xl">
            SeeThrough
          </h1>
        </div>
        <Link
          href="/"
          className="rounded-xl border border-board-edge bg-chalk px-3 py-2 font-sans text-sm font-medium text-ink hover:bg-paper"
        >
          Back to lessons
        </Link>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4 overflow-hidden p-4 md:p-5">
        <form
          className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-stretch"
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
        >
          <label className="sr-only" htmlFor="drawing-description">
            Architecture description
          </label>
          <input
            id="drawing-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
            maxLength={800}
            placeholder="Describe an architecture to draw…"
            className="h-11 min-w-0 flex-1 rounded-xl border border-board-edge bg-chalk px-4 font-sans text-sm text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-3 focus:ring-accent-soft disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !description.trim()}
            className="h-11 shrink-0 rounded-xl bg-accent px-5 font-sans text-sm font-semibold text-white transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "generating"
              ? "Planning…"
              : status === "drawing"
                ? "Drawing…"
                : "Draw"}
          </button>
        </form>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={replay}
            disabled={!batches?.length || busy}
            className="rounded-xl border border-board-edge bg-chalk px-3 py-2 font-sans text-sm font-medium text-ink hover:bg-paper disabled:opacity-40"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={() => void exportPng()}
            disabled={!batches?.length}
            className="rounded-xl border border-board-edge bg-chalk px-3 py-2 font-sans text-sm font-medium text-ink hover:bg-paper disabled:opacity-40"
          >
            Export PNG
          </button>
          <button
            type="button"
            onClick={() => boardApi.current?.clearScene()}
            disabled={!batches?.length}
            className="rounded-xl border border-board-edge bg-chalk px-3 py-2 font-sans text-sm font-medium text-ink hover:bg-paper disabled:opacity-40"
          >
            Clear
          </button>
          {plan?.title ? (
            <span className="ml-auto font-sans text-xs text-muted">
              {plan.title}
            </span>
          ) : null}
        </div>

        {error ? (
          <p className="shrink-0 rounded-xl bg-warn-soft px-3 py-2 font-sans text-sm text-warn">
            {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1" style={{ minHeight: 480 }}>
          <ExcalidrawBoard
            batches={batches}
            replayKey={replayKey}
            onReady={onBoardReady}
            onRevealDone={onRevealDone}
          />
        </div>

        <p className="shrink-0 font-sans text-[11px] text-muted">
          Uses packs in <code className="font-mono">assets/drawings</code>.
          Describe → LLM picks Excalidraw library shapes → they appear one by
          one → annotate with the pen → export PNG.
        </p>
      </div>
    </div>
  );
}
