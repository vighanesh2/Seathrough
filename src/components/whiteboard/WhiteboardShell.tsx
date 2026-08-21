"use client";

import { useCallback, useRef, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { AppHeader } from "@/components/lms/AppHeader";
import { AppShell } from "@/components/lms/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Whiteboard,
  type WhiteboardHandle,
  type WhiteboardTool,
} from "@/components/whiteboard/Whiteboard";
import type { PlayableStroke } from "@/lib/automatic-drawing/strokePlan";
import { toUserFacingError } from "@/lib/errors/userFacing";

const COLORS = [
  { id: "ink", value: "#1a2b3c", label: "Ink" },
  { id: "accent", value: "#1b6ca8", label: "Blue" },
  { id: "green", value: "#2a7a5c", label: "Green" },
  { id: "warn", value: "#b86a1e", label: "Orange" },
  { id: "error", value: "#c24545", label: "Red" },
] as const;

const WIDTHS = [2, 4, 8] as const;

type Status = "idle" | "expanding" | "planning" | "drawing" | "ready" | "error";

export function WhiteboardShell() {
  const { user, accessToken, logout } = useAuth();
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const boardRef = useRef<WhiteboardHandle | null>(null);
  const [tool, setTool] = useState<WhiteboardTool>("pen");
  const [color, setColor] = useState<string>(COLORS[0].value);
  const [width, setWidth] = useState<number>(4);
  const [canUndo, setCanUndo] = useState(false);
  const [prompt, setPrompt] = useState(
    "A simple sailboat on calm water with a sun",
  );
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  const busy =
    status === "expanding" || status === "planning" || status === "drawing";

  const onReady = useCallback((handle: WhiteboardHandle) => {
    boardRef.current = handle;
    setCanUndo(handle.canUndo());
  }, []);

  async function autoDraw() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Describe what to draw first.");
      setStatus("error");
      return;
    }

    if (!user || !accessToken) {
      setAuthModal("login");
      return;
    }

    setError(null);
    setTitle(null);
    setExpandedPrompt(null);
    setStatus("expanding");
    boardRef.current?.stopPlayback();

    try {
      const res = await fetch("/api/automatic-drawing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ description: trimmed }),
      });
      const body = (await res.json()) as {
        plan?: { title: string; width: number; height: number };
        strokes?: PlayableStroke[];
        expandedPrompt?: string;
        source?: string;
        error?: string;
      };
      if (!res.ok || !body.plan || !body.strokes?.length) {
        throw new Error(body.error || "Could not generate drawing");
      }

      if (body.expandedPrompt) {
        setExpandedPrompt(body.expandedPrompt);
      }
      setTitle(body.plan.title);
      setStatus("drawing");
      await boardRef.current?.playStrokes(body.strokes, {
        width: body.plan.width,
        height: body.plan.height,
      });
      setStatus("ready");
      setCanUndo(true);
    } catch (err) {
      setStatus("error");
      setError(toUserFacingError(err));
    }
  }

  function exportPng() {
    const dataUrl = boardRef.current?.exportPng();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${(title || "seethrough-whiteboard")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}.png`;
    a.click();
  }

  return (
    <AppShell className="flex-col">
      <AuthModal
        key={authModal ?? "closed"}
        open={authModal != null}
        initialMode={authModal ?? "login"}
        onClose={() => setAuthModal(null)}
      />

      <AppHeader
        current="automatic-drawing"
        eyebrow="Lab"
        title="Automatic whiteboard"
        account={
          <AccountMenu
            onLogin={() => setAuthModal("login")}
            onSignup={() => setAuthModal("signup")}
            onLogout={() => {
              void logout();
            }}
          />
        }
      />

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 overflow-hidden p-4 md:p-5">
        <form
          className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-stretch"
          onSubmit={(e) => {
            e.preventDefault();
            void autoDraw();
          }}
        >
          <label className="sr-only" htmlFor="auto-draw-prompt">
            Drawing prompt
          </label>
          <Input
            id="auto-draw-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={busy}
            maxLength={800}
            placeholder="Describe what to draw…"
            className="h-11 min-w-0 flex-1 bg-card px-4"
          />
          <Button
            type="submit"
            size="lg"
            disabled={busy || !prompt.trim()}
            className="shrink-0"
          >
            {status === "expanding"
              ? "Expanding…"
              : status === "planning"
                ? "Planning…"
                : status === "drawing"
                  ? "Drawing…"
                  : "Draw"}
          </Button>
        </form>

        {expandedPrompt ? (
          <p className="shrink-0 rounded-xl border border-board-edge/70 bg-paper/60 px-3 py-2 font-sans text-xs leading-relaxed text-muted">
            <span className="font-semibold text-ink">Expanded brief: </span>
            {expandedPrompt}
          </p>
        ) : null}

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTool("pen")}
            disabled={busy}
            className={[
              "rounded-xl border px-3 py-2 font-sans text-sm font-medium transition disabled:opacity-40",
              tool === "pen"
                ? "border-accent bg-accent-soft text-accent-deep"
                : "border-board-edge bg-chalk text-ink hover:bg-paper",
            ].join(" ")}
          >
            Pen
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            disabled={busy}
            className={[
              "rounded-xl border px-3 py-2 font-sans text-sm font-medium transition disabled:opacity-40",
              tool === "eraser"
                ? "border-accent bg-accent-soft text-accent-deep"
                : "border-board-edge bg-chalk text-ink hover:bg-paper",
            ].join(" ")}
          >
            Eraser
          </button>

          <span className="mx-1 hidden h-6 w-px bg-board-edge sm:block" />

          <div className="flex items-center gap-1.5" role="group" aria-label="Color">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                title={c.label}
                aria-label={c.label}
                disabled={busy}
                onClick={() => {
                  setColor(c.value);
                  setTool("pen");
                }}
                className={[
                  "h-8 w-8 rounded-full border-2 transition disabled:opacity-40",
                  color === c.value && tool === "pen"
                    ? "border-ink scale-110"
                    : "border-transparent",
                ].join(" ")}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>

          <span className="mx-1 hidden h-6 w-px bg-board-edge sm:block" />

          <div className="flex items-center gap-1" role="group" aria-label="Stroke width">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                disabled={busy}
                onClick={() => setWidth(w)}
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-xl border transition disabled:opacity-40",
                  width === w
                    ? "border-accent bg-accent-soft"
                    : "border-board-edge bg-chalk hover:bg-paper",
                ].join(" ")}
                aria-label={`Stroke ${w}px`}
              >
                <span
                  className="rounded-full bg-ink"
                  style={{ width: w + 4, height: w + 4 }}
                />
              </button>
            ))}
          </div>

          <span className="mx-1 hidden h-6 w-px bg-board-edge sm:block" />

          <button
            type="button"
            onClick={() => boardRef.current?.undo()}
            disabled={!canUndo || busy}
            className="rounded-xl border border-board-edge bg-chalk px-3 py-2 font-sans text-sm font-medium text-ink hover:bg-paper disabled:opacity-40"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => {
              boardRef.current?.clear();
              setTitle(null);
              setExpandedPrompt(null);
              setStatus("idle");
            }}
            className="rounded-xl border border-board-edge bg-chalk px-3 py-2 font-sans text-sm font-medium text-ink hover:bg-paper"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={exportPng}
            className="rounded-xl border border-board-edge bg-chalk px-3 py-2 font-sans text-sm font-medium text-ink hover:bg-paper"
          >
            Export PNG
          </button>

          {title ? (
            <span className="ml-auto font-sans text-xs text-muted">{title}</span>
          ) : null}
        </div>

        {error ? (
          <p className="shrink-0 rounded-xl bg-warn-soft px-3 py-2 font-sans text-sm text-warn">
            {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1">
          <Whiteboard
            tool={tool}
            color={color}
            width={width}
            locked={busy}
            onReady={onReady}
            onHistoryChange={setCanUndo}
          />
        </div>

        <p className="shrink-0 font-sans text-[11px] text-muted">
          Prompt → expand brief → compose layered scene graph (fills + strokes)
          → watch it draw → edit → export PNG.
        </p>
      </div>
    </AppShell>
  );
}
