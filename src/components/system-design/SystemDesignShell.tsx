"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/components/AuthProvider";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { AppHeader } from "@/components/lms/AppHeader";
import { AppShell } from "@/components/lms/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuestionAccess } from "@/components/usage/QuestionAccess";
import type { ExcalidrawBoardHandle } from "@/components/automatic-drawing/ExcalidrawBoard";
import { ThinkingLoader } from "@/components/ui/ThinkingLoader";
import type {
  ExcalidrawScenePlan,
  RevealBatch,
} from "@/lib/automatic-drawing/schema";
import { toUserFacingError } from "@/lib/errors/userFacing";
import { clearPendingPrompt, takePendingPrompt } from "@/lib/usage/pendingPrompt";

const ExcalidrawBoard = dynamic(
  () =>
    import("@/components/automatic-drawing/ExcalidrawBoard").then(
      (m) => m.ExcalidrawBoard,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="relative flex h-full min-h-90 items-center justify-center rounded-2xl border border-board-edge bg-chalk">
        <ThinkingLoader variant="panel" label="Loading the board" className="border-0 bg-transparent" />
      </div>
    ),
  },
);

const STARTERS = [
  "URL shortener with cache, app servers, and a SQL store",
  "Chat app: websocket gateway, message queue, and presence cache",
  "Rate limiter in front of an API with Redis and a primary database",
  "News feed: write path, fan-out queue, and read cache",
];

type Status = "idle" | "generating" | "drawing" | "ready" | "error";

export function SystemDesignShell() {
  const { accessToken, loading: authLoading, logout } = useAuth();
  const { beginQuestion, cancelQuestion, openAuth } = useQuestionAccess();
  const boardApi = useRef<ExcalidrawBoardHandle | null>(null);
  const [description, setDescription] = useState(STARTERS[0]!);
  const [plan, setPlan] = useState<ExcalidrawScenePlan | null>(null);
  const [batches, setBatches] = useState<RevealBatch[] | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const pendingHandledRef = useRef(false);

  useEffect(() => {
    if (pendingHandledRef.current) return;
    const pending = takePendingPrompt();
    if (!pending) return;
    pendingHandledRef.current = true;
    setDescription(pending.prompt);
    if (pending.autoStart) {
      queueMicrotask(() => {
        void generateWithText(pending.prompt).finally(() => {
          clearPendingPrompt();
        });
      });
    } else {
      clearPendingPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot marketing handoff
  }, []);

  const onRevealDone = useCallback(() => {
    setStatus("ready");
  }, []);

  const onBoardReady = useCallback((handle: ExcalidrawBoardHandle) => {
    boardApi.current = handle;
  }, []);

  async function generateWithText(trimmed: string) {
    if (!trimmed) {
      setError("Describe the architecture first.");
      setStatus("error");
      return;
    }
    if (!beginQuestion()) return;

    setError(null);
    setStatus("generating");
    setBatches(null);
    setPlan(null);
    boardApi.current?.clearScene();

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const res = await fetch("/api/system-design/generate", {
        method: "POST",
        headers,
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
      cancelQuestion();
      setStatus("error");
      setError(toUserFacingError(err));
    }
  }

  async function generate() {
    await generateWithText(description.trim());
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
    a.download = `${(plan?.title || "system-design")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const busy = status === "generating" || status === "drawing";

  return (
    <AppShell className="flex-col">
      <AppHeader
        current="system-design"
        eyebrow="System design"
        title={plan?.title ?? "Describe an architecture"}
        account={
          <AccountMenu
            onLogin={() => openAuth("login")}
            onSignup={() => openAuth("signup")}
            onLogout={() => {
              void logout();
              boardApi.current?.clearScene();
              setBatches(null);
              setPlan(null);
              setStatus("idle");
            }}
          />
        }
      />

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 overflow-hidden p-4 md:p-5">
        <form
          className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-stretch"
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
        >
          <label className="sr-only" htmlFor="system-design-prompt">
            Architecture description
          </label>
          <Input
            id="system-design-prompt"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
            maxLength={800}
            placeholder="A news feed write path with a queue, cache, and database…"
            className="h-11 min-w-0 flex-1 bg-card px-4"
          />
          <Button
            type="submit"
            size="lg"
            disabled={busy || !description.trim()}
            className="shrink-0"
          >
            {status === "generating"
              ? "Placing…"
              : status === "drawing"
                ? "Drawing…"
                : "Draw architecture"}
          </Button>
        </form>

        <div className="flex shrink-0 flex-wrap gap-2">
          {STARTERS.map((starter) => (
            <Button
              key={starter}
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setDescription(starter)}
              className="max-w-full truncate"
            >
              {starter}
            </Button>
          ))}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={replay}
            disabled={!batches?.length || busy}
          >
            Replay
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void exportPng()}
            disabled={!batches?.length}
          >
            Export PNG
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => boardApi.current?.clearScene()}
            disabled={!batches?.length}
          >
            Clear
          </Button>
        </div>

        {error ? (
          <p className="shrink-0 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
            {error}
          </p>
        ) : null}

        <div className="relative min-h-0 flex-1" style={{ minHeight: 420 }}>
          <ExcalidrawBoard
            batches={batches}
            replayKey={replayKey}
            onReady={onBoardReady}
            onRevealDone={onRevealDone}
          />
          {status === "generating" ? (
            <ThinkingLoader
              variant="overlay"
              phrases={[
                "Placing services",
                "Wiring the architecture",
                "Almost ready",
              ]}
            />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
