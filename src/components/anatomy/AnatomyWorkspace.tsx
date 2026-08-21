"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useQuestionAccess } from "@/components/usage/QuestionAccess";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { AppHeader } from "@/components/lms/AppHeader";
import { AppShell } from "@/components/lms/AppShell";
import { Button } from "@/components/ui/button";
import { ThinkingLoader } from "@/components/ui/ThinkingLoader";
import {
  ANATOMY_MODE_LABELS,
  modesForScene,
  SCENE_STRUCTURES,
  SCENE_TITLES,
  STRUCTURE_BY_ID,
} from "@/lib/anatomy/registry";
import type {
  AnatomyAnswer,
  AnatomyAnimationMode,
  AnatomySceneId,
  AnatomyStructureId,
} from "@/lib/anatomy/types";
import type { ThreeScenePlan } from "@/lib/three-scenes/decide";
import { clearPendingPrompt, takePendingPrompt } from "@/lib/usage/pendingPrompt";

const ThreeBoard = dynamic(
  () =>
    import("@/components/board/ThreeBoard").then((module) => module.ThreeBoard),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full min-h-105 place-items-center rounded-2xl border border-board-edge bg-board font-sans text-sm text-muted">
        Preparing the anatomy renderer…
      </div>
    ),
  },
);

type AnswerTurn = {
  id: number;
  question: string;
  answer?: AnatomyAnswer;
  error?: string;
};

const SPEEDS = [0.5, 1, 1.5] as const;

function sceneFromPrompt(text: string): AnatomySceneId {
  const t = text.toLowerCase();
  if (/\b(eye|retina|cornea|iris|pupil|vision|optic)\b/.test(t)) return "eye";
  return "cardiopulmonary";
}

const EXAMPLE_QUESTIONS: Record<AnatomySceneId, string[]> = {
  cardiopulmonary: [
    "How does blood travel from the body through the lungs and back?",
    "Why do pulmonary arteries carry deoxygenated blood?",
    "What happens at the alveoli?",
  ],
  eye: [
    "How does light travel through the eye?",
    "Why is the image on the retina upside down?",
    "How does the lens focus for near objects?",
  ],
};

const LEGENDS: Record<
  AnatomySceneId,
  Array<{ color: string; label: string }>
> = {
  cardiopulmonary: [
    { color: "bg-accent", label: "oxygen-poor blood" },
    { color: "bg-error", label: "oxygen-rich blood" },
    { color: "bg-success", label: "airflow / oxygen" },
  ],
  eye: [
    { color: "bg-copper", label: "light rays" },
    { color: "bg-error", label: "inverted retinal image" },
    { color: "bg-accent", label: "neural signal" },
  ],
};

export function AnatomyWorkspace() {
  const { accessToken, logout } = useAuth();
  const { beginQuestion, cancelQuestion, openAuth } = useQuestionAccess();
  const [sceneId, setSceneId] = useState<AnatomySceneId>("eye");
  const [selected, setSelected] = useState<AnatomyStructureId | null>(null);
  const [focused, setFocused] = useState<AnatomyStructureId[]>([]);
  const [mode, setMode] = useState<AnatomyAnimationMode>("overview");
  const [reveal, setReveal] = useState(6);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<AnswerTurn[]>([]);
  const [asking, setAsking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const turnIdRef = useRef(0);
  const pendingHandledRef = useRef(false);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const pending = takePendingPrompt();
    if (!pending) return;
    const scene = sceneFromPrompt(pending.prompt);
    setSceneId(scene);
    setQuestion(pending.prompt);
    if (!pending.autoStart) {
      clearPendingPrompt();
      return;
    }

    const timer = window.setTimeout(() => {
      if (pendingHandledRef.current) return;
      pendingHandledRef.current = true;
      clearPendingPrompt();
      void askQuestion(pending.prompt, scene);
    }, 60);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot marketing handoff
  }, []);

  function switchScene(next: AnatomySceneId) {
    if (next === sceneId) return;
    setSceneId(next);
    setSelected(null);
    setFocused([]);
    setMode("overview");
    setReveal(6);
    setTurns([]);
    setQuestion("");
  }

  const scenePlan = useMemo<ThreeScenePlan>(
    () => ({
      id: sceneId,
      title:
        sceneId === "eye"
          ? "Normal eye and vision physiology"
          : "Normal cardiopulmonary physiology",
      reveal,
      maxReveal: 6,
      params: { animationMode: mode },
    }),
    [mode, reveal, sceneId],
  );

  const availableModes = useMemo(() => modesForScene(sceneId), [sceneId]);

  const structuresBySystem = useMemo(() => {
    const groups = new Map<string, typeof SCENE_STRUCTURES.eye>();
    for (const structure of SCENE_STRUCTURES[sceneId]) {
      if (structure.reveal > reveal) continue;
      const group = groups.get(structure.system) ?? [];
      group.push(structure);
      groups.set(structure.system, group);
    }
    return [...groups.entries()];
  }, [reveal, sceneId]);

  function selectStructure(structure: AnatomyStructureId | null) {
    setSelected(structure);
    setFocused(structure ? [structure] : []);
  }

  async function askQuestion(
    text = question,
    sceneOverride?: AnatomySceneId,
  ) {
    const trimmed = text.trim();
    if (!trimmed || asking) return;
    if (!beginQuestion()) return;

    const activeScene = sceneOverride ?? sceneId;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    const id = ++turnIdRef.current;
    setTurns((current) => [{ id, question: trimmed }, ...current]);
    setQuestion("");
    setAsking(true);

    try {
      const response = await fetch("/api/anatomy/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          question: trimmed,
          selectedStructure: selected,
          sceneMode: mode,
          sceneId: activeScene,
        }),
        signal: controller.signal,
      });
      const body = (await response.json()) as AnatomyAnswer & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error || "The anatomy tutor could not answer.");
      }
      setTurns((current) =>
        current.map((turn) =>
          turn.id === id ? { ...turn, answer: body } : turn,
        ),
      );
      setFocused(body.focusStructures);
      setSelected(body.focusStructures[0] ?? selected);
      setMode(body.animationMode);
      setReveal(body.reveal);
    } catch (error) {
      cancelQuestion();
      const message =
        controller.signal.aborted
          ? "The answer took too long. The 3D figure is still available; try again."
          : error instanceof Error
            ? error.message
            : "The anatomy tutor could not answer.";
      setTurns((current) =>
        current.map((turn) =>
          turn.id === id ? { ...turn, error: message } : turn,
        ),
      );
    } finally {
      window.clearTimeout(timeout);
      if (abortRef.current === controller) abortRef.current = null;
      setAsking(false);
    }
  }

  const selectedInfo = selected ? STRUCTURE_BY_ID[selected] : null;

  return (
    <AppShell className="flex-col md:overflow-hidden overflow-y-auto">

      <AppHeader
        current="figures-3d"
        eyebrow="Body"
        title={SCENE_TITLES[sceneId]}
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary p-0.5">
            {(
              [
                ["eye", "Eye"],
                ["cardiopulmonary", "Heart"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => switchScene(id)}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  sceneId === id
                    ? "bg-card text-accent-deep shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
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

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[250px_minmax(0,1fr)_360px]">
        <aside className="hidden min-h-0 overflow-y-auto border-r border-board-edge bg-card/80 p-3 xl:block">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Structures
            </h2>
            <button
              type="button"
              onClick={() => selectStructure(null)}
              className="font-sans text-[11px] font-semibold text-accent hover:text-accent-deep"
            >
              Reset
            </button>
          </div>
          <div className="space-y-4">
            {structuresBySystem.map(([system, structures]) => (
              <section key={system}>
                <h3 className="mb-1.5 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {system}
                </h3>
                <div className="space-y-1">
                  {structures.map((structure) => (
                    <button
                      key={structure.id}
                      type="button"
                      onClick={() => selectStructure(structure.id)}
                      className={`w-full rounded-lg px-2.5 py-2 text-left font-sans text-xs transition ${
                        selected === structure.id
                          ? "bg-accent-soft font-semibold text-accent-deep"
                          : "text-ink-soft hover:bg-paper-deep"
                      }`}
                    >
                      {structure.label}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col bg-paper p-2 md:p-4">
          <div className="relative min-h-90 flex-1">
            <ThreeBoard
              plan={scenePlan}
              playing={playing}
              speed={speed}
              selectedStructure={selected}
              focusStructures={focused}
              animationMode={mode}
              onSelectStructure={selectStructure}
              showStructureControls
              className="h-full min-h-90 w-full overflow-hidden rounded-2xl border border-board-edge bg-board shadow-(--shadow-shell)"
            />
          </div>

          <div className="mt-2 grid shrink-0 gap-2 rounded-xl border border-board-edge bg-card/90 p-2.5 shadow-sm md:grid-cols-[auto_1fr_auto] md:items-center">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPlaying((value) => !value)}
                className="h-9 rounded-lg bg-accent px-3 font-sans text-xs font-semibold text-primary-foreground hover:bg-accent-deep"
                aria-label={playing ? "Pause physiology" : "Play physiology"}
              >
                {playing ? "Pause" : "Play"}
              </button>
              {SPEEDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSpeed(value)}
                  className={`h-9 rounded-lg px-2.5 font-sans text-[11px] font-semibold ${
                    speed === value
                      ? "bg-accent-soft text-accent-deep"
                      : "bg-paper text-muted hover:text-ink"
                  }`}
                >
                  {value}×
                </button>
              ))}
            </div>

            <label className="flex min-w-0 items-center gap-2 font-sans text-[11px] text-muted">
              View
              <select
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as AnatomyAnimationMode)
                }
                className="min-w-0 flex-1 rounded-lg border border-board-edge bg-card px-2.5 py-2 text-xs font-semibold text-ink outline-none focus:border-accent"
              >
                {availableModes.map((id) => (
                  <option key={id} value={id}>
                    {ANATOMY_MODE_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 font-sans text-[11px] text-muted">
              Detail {reveal}/6
              <input
                type="range"
                min={1}
                max={6}
                value={reveal}
                onChange={(event) => setReveal(Number(event.target.value))}
                className="w-24 accent-accent"
              />
            </label>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 px-1 font-sans text-[10px] text-muted">
            {LEGENDS[sceneId].map((item) => (
              <span key={item.label}>
                <i
                  className={`mr-1 inline-block size-2 rounded-full ${item.color}`}
                />
                {item.label}
              </span>
            ))}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-t border-board-edge bg-card md:border-l md:border-t-0">
          <div className="shrink-0 border-b border-board-edge p-4">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              {selectedInfo ? selectedInfo.system : "Interactive guide"}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-ink">
              {selectedInfo?.label ?? "Select a structure"}
            </h2>
            <p className="mt-2 font-sans text-xs leading-5 text-ink-soft">
              {selectedInfo?.description ??
                "Click the model or choose a structure to focus the camera and read its role."}
            </p>
            {selectedInfo ? (
              <p className="mt-2 rounded-lg bg-accent-soft/50 p-2.5 font-sans text-xs leading-5 text-accent-deep">
                {selectedInfo.function}
              </p>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Ask about this figure
            </h2>
            <form
              className="mt-3"
              onSubmit={(event) => {
                event.preventDefault();
                void askQuestion();
              }}
            >
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={600}
                rows={3}
                placeholder={
                  sceneId === "eye"
                    ? "Why is the retinal image upside down?"
                    : "How does the right ventricle send blood to the lungs?"
                }
                className="w-full resize-none rounded-xl border border-board-edge bg-paper px-3 py-2.5 font-sans text-sm text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent-soft"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="font-sans text-[10px] text-muted">
                  {question.length}/600
                </span>
                <button
                  type="submit"
                  disabled={!question.trim() || asking}
                  className="rounded-lg bg-accent px-3.5 py-2 font-sans text-xs font-semibold text-white hover:bg-accent-deep disabled:opacity-40"
                >
                  {asking ? "Asking…" : "Ask"}
                </button>
              </div>
            </form>

            {asking ? (
              <ThinkingLoader
                variant="panel"
                phrases={[
                  "Checking sources",
                  "Focusing structures",
                  "Almost ready",
                ]}
                className="mt-3"
              />
            ) : null}

            {!turns.length ? (
              <div className="mt-4 space-y-2">
                {EXAMPLE_QUESTIONS[sceneId].map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => void askQuestion(example)}
                    className="w-full rounded-lg border border-board-edge bg-paper px-3 py-2 text-left font-sans text-[11px] leading-4 text-ink-soft hover:border-accent hover:text-accent-deep"
                  >
                    {example}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-4 space-y-3" aria-live="polite">
              {turns.map((turn) => (
                <article
                  key={turn.id}
                  className="rounded-xl border border-board-edge bg-paper p-3"
                >
                  <p className="font-sans text-xs font-semibold text-ink">
                    {turn.question}
                  </p>
                  {!turn.answer && !turn.error ? (
                    <p className="mt-2 animate-pulse font-sans text-xs text-muted">
                      Matching the question to reviewed sources…
                    </p>
                  ) : null}
                  {turn.error ? (
                    <p className="mt-2 font-sans text-xs leading-5 text-error">
                      {turn.error}
                    </p>
                  ) : null}
                  {turn.answer ? (
                    <>
                      <p className="mt-2 font-sans text-xs leading-5 text-ink-soft">
                        {turn.answer.answer}
                      </p>
                      {turn.answer.citations.length ? (
                        <div className="mt-3 border-t border-board-edge pt-2">
                          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                            Sources
                          </p>
                          <ul className="mt-1 space-y-1">
                            {turn.answer.citations.map((citation) => (
                              <li key={citation.id}>
                                <a
                                  href={citation.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-sans text-[11px] text-accent underline-offset-2 hover:underline"
                                >
                                  {citation.title} — {citation.publisher}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <footer className="shrink-0 border-t border-board-edge px-4 py-2.5 font-sans text-[9px] leading-4 text-muted">
            {sceneId === "cardiopulmonary"
              ? "Geometry: NIH 3D Human Reference Atlas, CC BY 4.0. Normal physiology visualization for education; not diagnosis or treatment guidance."
              : "Procedural educational model grounded in reviewed anatomy sources. Normal vision physiology for education; not diagnosis or treatment guidance."}
          </footer>
        </aside>
      </div>
    </AppShell>
  );
}
