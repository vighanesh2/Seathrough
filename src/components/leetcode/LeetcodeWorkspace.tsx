"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useQuestionAccess } from "@/components/usage/QuestionAccess";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { AppHeader } from "@/components/lms/AppHeader";
import { AppShell } from "@/components/lms/AppShell";
import { Button } from "@/components/ui/button";
import { ThinkingLoader } from "@/components/ui/ThinkingLoader";
import {
  ALGO_PATTERN_LABELS,
  type AlgoFrame,
  type AlgoSpec,
  type AlgoVisualizeResult,
  type CellState,
} from "@/lib/leetcode/types";

const SPEEDS = [0.5, 1, 1.5] as const;

const EXAMPLES = [
  "Two Sum: nums = [2,7,11,15], target = 9",
  'Valid Palindrome: s = "A man, a plan, a canal: Panama"',
  'Longest Substring Without Repeating Characters: s = "abcabcbb"',
  "Binary Search: nums = [-1,0,3,5,9,12], target = 9",
  'Valid Parentheses: s = "()[]{}"',
  "Container With Most Water: height = [1,8,6,2,5,4,8,3,7]",
];

const CELL_FILL: Record<CellState, string> = {
  default: "#f4f7fb",
  active: "#f8e4d0",
  pointer: "#d4e8f6",
  matched: "#d5efe4",
  discarded: "#e8eef5",
  window: "#c5d9ea",
};

const CELL_STROKE: Record<CellState, string> = {
  default: "#c8d6e4",
  active: "#c45e1a",
  pointer: "#1b6ca8",
  matched: "#2a7a5c",
  discarded: "#6a7d90",
  window: "#0f4f7c",
};

type VisualizeResponse = AlgoVisualizeResult & {
  hint?: string;
  error?: string;
};

export function LeetcodeWorkspace() {
  const { accessToken, logout } = useAuth();
  const { beginQuestion, cancelQuestion, openAuth } = useQuestionAccess();
  const [prompt, setPrompt] = useState(EXAMPLES[0]!);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [spec, setSpec] = useState<AlgoSpec | null>(null);
  const [frames, setFrames] = useState<AlgoFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const abortRef = useRef<AbortController | null>(null);

  const frame = frames[frameIndex] ?? null;
  const maxIndex = Math.max(0, frames.length - 1);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      queueMicrotask(() => setPlaying(false));
    }
  }, []);

  useEffect(() => {
    if (!playing || frames.length <= 1) return;
    const ms = Math.max(350, 1100 / speed);
    const id = window.setInterval(() => {
      setFrameIndex((prev) => {
        if (prev >= frames.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [playing, frames.length, speed]);

  async function runVisualize(nextPrompt?: string) {
    const text = (nextPrompt ?? prompt).trim();
    if (!text) {
      setError("Paste a LeetCode-style problem first.");
      return;
    }
    if (!beginQuestion()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    setHint(null);
    setPlaying(false);

    try {
      const res = await fetch("/api/leetcode/visualize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ prompt: text }),
        signal: controller.signal,
      });
      const data = (await res.json()) as VisualizeResponse;
      if (!res.ok) {
        cancelQuestion();
        setError(data.error ?? "Could not visualize this problem.");
        return;
      }
      setSpec(data.spec);
      setFrames(data.frames ?? []);
      setFrameIndex(0);
      setHint(data.hint ?? null);
      if ((data.frames?.length ?? 0) > 1) {
        const mq =
          typeof window !== "undefined"
            ? window.matchMedia("(prefers-reduced-motion: reduce)")
            : null;
        setPlaying(!mq?.matches);
      }
    } catch (err) {
      cancelQuestion();
      if ((err as Error).name === "AbortError") return;
      setError("Network error while visualizing. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const board = useMemo(() => {
    if (!frame) return null;
    return <AlgoBoard frame={frame} />;
  }, [frame]);

  return (
    <AppShell className="flex-col">

      <AppHeader
        current="leetcode"
        eyebrow="Coding practice"
        title={spec?.title ?? "Paste a problem to step through it"}
        account={
          <AccountMenu
            onLogin={() => openAuth("login")}
            onSignup={() => openAuth("signup")}
            onLogout={() => {
              void logout();
            }}
          />
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="flex min-h-0 flex-col gap-3 p-4 md:p-6">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-board-edge bg-card/80 shadow-(--shadow-shell)">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-board-edge px-4 py-3">
              <div className="min-w-0">
                {spec ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-accent-soft px-2 py-0.5 font-sans text-[11px] font-semibold text-accent-deep">
                      {ALGO_PATTERN_LABELS[spec.pattern]}
                    </span>
                    <span className="truncate font-sans text-sm font-semibold">
                      {spec.title}
                    </span>
                    {!spec.supported ? (
                      <span className="rounded-md bg-warn-soft px-2 py-0.5 font-sans text-[10px] font-semibold text-warn">
                        best-effort
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <p className="font-sans text-sm text-muted">
                    Paste a problem and press Visualize to animate the steps.
                  </p>
                )}
              </div>
              {frames.length ? (
                <p className="font-sans text-xs text-muted">
                  Step {frameIndex + 1} / {frames.length}
                </p>
              ) : null}
            </div>

            <div className="min-h-90 flex-1 overflow-auto p-4 md:p-6">
              {board ?? (
                <div className="grid h-full min-h-70 place-items-center font-sans text-sm text-muted">
                  Array cells, pointers, hash maps, and stacks will appear here.
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-board-edge bg-paper/80 px-4 py-3">
              <button
                type="button"
                disabled={!frames.length || frameIndex <= 0}
                onClick={() => {
                  setPlaying(false);
                  setFrameIndex((i) => Math.max(0, i - 1));
                }}
                className="rounded-lg border border-board-edge bg-card px-3 py-2 font-sans text-xs font-semibold disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={frames.length <= 1}
                onClick={() => setPlaying((p) => !p)}
                className="rounded-lg border border-accent bg-accent-soft px-3 py-2 font-sans text-xs font-semibold text-accent-deep disabled:opacity-40"
              >
                {playing ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                disabled={!frames.length || frameIndex >= maxIndex}
                onClick={() => {
                  setPlaying(false);
                  setFrameIndex((i) => Math.min(maxIndex, i + 1));
                }}
                className="rounded-lg border border-board-edge bg-card px-3 py-2 font-sans text-xs font-semibold disabled:opacity-40"
              >
                Next
              </button>
              <input
                type="range"
                min={0}
                max={maxIndex || 0}
                value={frameIndex}
                disabled={!frames.length}
                onChange={(e) => {
                  setPlaying(false);
                  setFrameIndex(Number(e.target.value));
                }}
                className="mx-2 min-w-40 flex-1"
                aria-label="Step scrubber"
              />
              <div className="flex items-center gap-1 rounded-lg border border-board-edge bg-card p-0.5">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`rounded-md px-2 py-1.5 font-sans text-[11px] font-semibold ${
                      speed === s
                        ? "bg-accent-soft text-accent-deep"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          {frame ? (
            <div className="rounded-2xl border border-board-edge bg-card/85 px-4 py-3 shadow-(--shadow-shell)">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                {frame.title}
              </p>
              <p className="mt-1 font-sans text-sm leading-relaxed text-ink">
                {frame.note}
              </p>
            </div>
          ) : null}
        </main>

        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-board-edge bg-card/80 p-4 lg:border-l lg:border-t-0 lg:p-5">
          <div>
            <label
              htmlFor="leetcode-prompt"
              className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-accent"
            >
              Problem
            </label>
            <textarea
              id="leetcode-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              placeholder='e.g. Two Sum: nums = [2,7,11,15], target = 9'
              className="mt-2 w-full resize-y rounded-xl border border-board-edge bg-paper px-3 py-2 font-sans text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => void runVisualize()}
              className="mt-3 w-full rounded-xl bg-accent px-4 py-2.5 font-sans text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-50"
            >
              {loading ? "Visualizing…" : "Visualize"}
            </button>
            {loading ? (
              <ThinkingLoader
                variant="panel"
                phrases={["Reading the problem", "Building steps", "Almost ready"]}
                className="mt-3"
              />
            ) : null}
            {error ? (
              <p className="mt-2 font-sans text-xs text-warn">{error}</p>
            ) : null}
            {hint ? (
              <p className="mt-2 font-sans text-xs text-muted">{hint}</p>
            ) : null}
          </div>

          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              Examples
            </p>
            <ul className="mt-2 flex flex-col gap-2">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt(ex);
                      void runVisualize(ex);
                    }}
                    className="w-full rounded-xl border border-board-edge bg-paper px-3 py-2 text-left font-sans text-xs leading-snug text-ink transition hover:border-accent hover:bg-accent-soft/30"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {spec ? (
            <div className="rounded-xl border border-board-edge bg-paper p-3">
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                Spec
              </p>
              <p className="mt-1 font-sans text-xs text-muted">{spec.summary}</p>
              <dl className="mt-2 space-y-1 font-sans text-xs">
                {spec.nums ? (
                  <div>
                    <dt className="inline text-muted">nums: </dt>
                    <dd className="inline font-medium">
                      [{spec.nums.join(", ")}]
                    </dd>
                  </div>
                ) : null}
                {spec.text != null ? (
                  <div>
                    <dt className="inline text-muted">s: </dt>
                    <dd className="inline font-medium">&quot;{spec.text}&quot;</dd>
                  </div>
                ) : null}
                {spec.target !== undefined ? (
                  <div>
                    <dt className="inline text-muted">target: </dt>
                    <dd className="inline font-medium">{spec.target}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="inline text-muted">source: </dt>
                  <dd className="inline font-medium">{spec.source}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="rounded-xl border border-dashed border-board-edge p-3">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              Legend
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-2 font-sans text-[11px]">
              {(
                [
                  ["active", "Current"],
                  ["pointer", "Pointer"],
                  ["matched", "Match"],
                  ["window", "Window"],
                  ["discarded", "Discarded"],
                  ["default", "Default"],
                ] as const
              ).map(([state, label]) => (
                <li key={state} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-sm border"
                    style={{
                      background: CELL_FILL[state],
                      borderColor: CELL_STROKE[state],
                    }}
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function AlgoBoard({ frame }: { frame: AlgoFrame }) {
  const cellW = 56;
  const cellH = 56;
  const gap = 8;
  const padX = 40;
  const padY = 56;
  const width = Math.max(
    320,
    padX * 2 + frame.cells.length * (cellW + gap) - gap,
  );
  const height = padY + cellH + 70 + (frame.auxRows ? 160 : 40);

  const pointerByIndex = new Map<number, string[]>();
  for (const pointer of frame.pointers) {
    const list = pointerByIndex.get(pointer.index) ?? [];
    list.push(pointer.label);
    pointerByIndex.set(pointer.index, list);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-full"
        role="img"
        aria-label={frame.title}
      >
        {frame.truncated ? (
          <text x={padX} y={24} fill="#6a7d90" fontSize={12} fontFamily="sans-serif">
            Showing first cells (input truncated)
          </text>
        ) : (
          <text x={padX} y={24} fill="#6a7d90" fontSize={12} fontFamily="sans-serif">
            {frame.title}
          </text>
        )}

        {frame.cells.map((cell, i) => {
          const x = padX + i * (cellW + gap);
          const y = padY;
          const labels = pointerByIndex.get(i) ?? [];
          return (
            <g key={`${cell.index}-${cell.value}`}>
              <rect
                x={x}
                y={y}
                width={cellW}
                height={cellH}
                rx={8}
                fill={CELL_FILL[cell.state]}
                stroke={CELL_STROKE[cell.state]}
                strokeWidth={2}
              />
              <text
                x={x + cellW / 2}
                y={y + cellH / 2 + 5}
                textAnchor="middle"
                fill="#1a2b3c"
                fontSize={18}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontWeight={600}
              >
                {cell.value}
              </text>
              <text
                x={x + cellW / 2}
                y={y + cellH + 18}
                textAnchor="middle"
                fill="#6a7d90"
                fontSize={11}
                fontFamily="sans-serif"
              >
                {cell.index}
              </text>
              {labels.map((label, li) => (
                <g key={label}>
                  <polygon
                    points={`${x + cellW / 2},${y - 8} ${x + cellW / 2 - 7},${y - 22} ${x + cellW / 2 + 7},${y - 22}`}
                    fill={CELL_STROKE.pointer}
                    transform={li > 0 ? `translate(${li * 14}, 0)` : undefined}
                  />
                  <text
                    x={x + cellW / 2 + (li > 0 ? li * 14 : 0)}
                    y={y - 28}
                    textAnchor="middle"
                    fill="#0f4f7c"
                    fontSize={11}
                    fontFamily="sans-serif"
                    fontWeight={700}
                  >
                    {label}
                  </text>
                </g>
              ))}
            </g>
          );
        })}

        {frame.vars.length ? (
          <text
            x={padX}
            y={padY + cellH + 48}
            fill="#3d5166"
            fontSize={12}
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          >
            {frame.vars.map((v) => `${v.name}=${v.value}`).join("   ")}
          </text>
        ) : null}
      </svg>

      {frame.auxTitle ? (
        <div className="min-w-48 shrink-0 rounded-xl border border-board-edge bg-paper p-3">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
            {frame.auxTitle}
          </p>
          {frame.auxRows && frame.auxRows.length ? (
            <table className="mt-2 w-full font-mono text-xs">
              <tbody>
                {frame.auxRows.map((row) => (
                  <tr key={`${row.key}-${row.value}`} className="border-t border-board-edge/60">
                    <td className="py-1 pr-3 text-muted">{row.key}</td>
                    <td className="py-1 font-semibold">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 font-sans text-xs text-muted">empty</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
