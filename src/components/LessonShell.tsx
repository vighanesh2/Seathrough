"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMachine } from "@xstate/react";
import { CliTutor, type CliLine } from "@/components/CliTutor";
import { PaceControls } from "@/components/PaceControls";
import { PromptBar } from "@/components/PromptBar";
import { VisualStage } from "@/components/VisualStage";
import { consumeLessonStream } from "@/lib/client/consumeLessonStream";
import { lessonMachine } from "@/lib/lesson/machine";
import type { VisualPlan } from "@/lib/visuals/types";
import type { PaceSpeed, StreamEvent } from "@/types/lesson";

type LessonStatus = "idle" | "running" | "paused" | "done" | "error";

export function LessonShell() {
  const [prompt, setPrompt] = useState("explain what a class is in Java");
  const [status, setStatus] = useState<LessonStatus>("idle");
  const [speed, setSpeed] = useState<PaceSpeed>(1);
  const [title, setTitle] = useState<string | undefined>();
  const [visualPlan, setVisualPlan] = useState<VisualPlan | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [lines, setLines] = useState<CliLine[]>([]);
  const [codeBuffer, setCodeBuffer] = useState("");
  const [highlight, setHighlight] = useState<string | undefined>();
  const [, send] = useMachine(lessonMachine);

  const onDrawComplete = useCallback(() => {
    send({ type: "DRAW_DONE" });
  }, [send]);

  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speedRef = useRef<PaceSpeed>(1);
  const pausedRef = useRef(false);
  const pauseGateRef = useRef<Promise<void>>(Promise.resolve());
  const resumePauseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    speedRef.current = speed;
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      audioRef.current?.pause();
    };
  }, []);

  function waitIfPaused(): Promise<void> {
    if (!pausedRef.current) return Promise.resolve();
    pauseGateRef.current = new Promise<void>((resolve) => {
      resumePauseRef.current = resolve;
    });
    return pauseGateRef.current;
  }

  async function playAudio(mimeType: string, base64: string) {
    await waitIfPaused();
    const src = `data:${mimeType};base64,${base64}`;
    const audio = new Audio(src);
    audio.playbackRate = speedRef.current;
    audioRef.current = audio;

    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      void audio.play().catch(() => resolve());
    });
  }

  async function handleEvent(event: StreamEvent) {
    await waitIfPaused();

    switch (event.type) {
      case "plan_meta":
        setTitle(event.title);
        send({ type: "PLAN_READY" });
        send({ type: "VALIDATED" });
        setLines((prev) => [
          ...prev,
          {
            kind: "system",
            text: `$ teach --lang ${event.language} · lesson ${event.lessonId?.slice(0, 8) ?? "local"}`,
          },
        ]);
        break;
      case "beat_start":
        setHighlight(event.beat.highlight);
        setLines((prev) => [
          ...prev,
          {
            kind: "system",
            text: `$ beat ${event.beat.order} · ${event.beat.kind} · ${event.beat.cognitiveType ?? "—"}`,
          },
        ]);
        break;
      case "visual":
        setVisualPlan(event.plan);
        setPlayKey((k) => k + 1);
        setLines((prev) => [
          ...prev,
          {
            kind: "system",
            text: `$ draw · ${event.plan.renderer}${event.plan.assetId ? `:${event.plan.assetId}` : ""}${event.plan.sceneRecipe?.kind ? `:${event.plan.sceneRecipe.kind}` : ""}`,
          },
        ]);
        break;
      case "board":
      case "diagram":
        break;
      case "code_delta":
        setCodeBuffer((prev) => prev + event.text);
        break;
      case "narration":
        if (event.text.startsWith("[voice unavailable")) {
          setLines((prev) => [...prev, { kind: "system", text: event.text }]);
        } else {
          setLines((prev) => [
            ...prev,
            { kind: "narration", text: event.text },
          ]);
        }
        break;
      case "audio":
        send({ type: "DRAW_DONE" });
        await playAudio(event.mimeType, event.base64);
        send({ type: "SPEAK_DONE" });
        send({ type: "NEXT_BEAT" });
        break;
      case "human_summary":
        setLines((prev) => [...prev, { kind: "summary", text: event.text }]);
        break;
      case "error":
        send({ type: "ERROR", message: event.message });
        setLines((prev) => [
          ...prev,
          { kind: "system", text: `! error: ${event.message}` },
        ]);
        setStatus("error");
        break;
      case "done":
        send({ type: "COMPLETE" });
        setLines((prev) => [
          ...prev,
          { kind: "system", text: "$ lesson complete" },
        ]);
        setStatus("done");
        break;
      default:
        break;
    }
  }

  function resetLesson() {
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    pausedRef.current = false;
    resumePauseRef.current?.();
    resumePauseRef.current = null;
    send({ type: "RESET" });
    setStatus("idle");
    setTitle(undefined);
    setVisualPlan(null);
    setPlayKey((k) => k + 1);
    setLines([]);
    setCodeBuffer("");
    setHighlight(undefined);
  }

  async function startLesson() {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    resetLesson();
    send({ type: "START", title: trimmed });
    setStatus("running");
    setLines([{ kind: "system", text: `$ teach "${trimmed}"` }]);

    const controller = new AbortController();
    abortRef.current = controller;
    let sawTerminal = false;

    try {
      await consumeLessonStream({
        prompt: trimmed,
        withAudio: true,
        signal: controller.signal,
        onEvent: async (event) => {
          if (event.type === "error" || event.type === "done") {
            sawTerminal = true;
          }
          await handleEvent(event);
        },
      });
      if (!controller.signal.aborted && !sawTerminal) {
        setStatus("done");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const message =
        error instanceof Error ? error.message : "Failed to stream lesson";
      send({ type: "ERROR", message });
      setLines((prev) => [
        ...prev,
        { kind: "system", text: `! error: ${message}` },
      ]);
      setStatus("error");
    }
  }

  function togglePlay() {
    if (status === "idle" || status === "done" || status === "error") {
      void startLesson();
      return;
    }
    if (status === "running") {
      pausedRef.current = true;
      audioRef.current?.pause();
      send({ type: "INTERRUPT" });
      setStatus("paused");
      return;
    }
    pausedRef.current = false;
    send({ type: "RESUME" });
    setStatus("running");
    resumePauseRef.current?.();
    resumePauseRef.current = null;
    void audioRef.current?.play().catch(() => undefined);
  }

  function skipBeat() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = audioRef.current.duration || 0;
      audioRef.current.dispatchEvent(new Event("ended"));
    }
  }

  const busy = status === "running";

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1400px] flex-col gap-4 px-4 py-4 md:px-6 md:py-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="animate-fade-up">
          <h1 className="font-sans text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            Visual Education
          </h1>
        </div>
        <PaceControls
          playing={status === "running"}
          speed={speed}
          onTogglePlay={togglePlay}
          onSpeedChange={setSpeed}
          onSkip={skipBeat}
          disabled={status === "idle" && !prompt.trim()}
        />
      </header>

      <PromptBar
        value={prompt}
        onChange={setPrompt}
        onSubmit={() => {
          void startLesson();
        }}
        disabled={busy}
      />

      <div className="grid min-h-[min(70vh,720px)] flex-1 grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <VisualStage
          plan={visualPlan}
          playKey={playKey}
          title={title}
          onDrawComplete={onDrawComplete}
        />
        <CliTutor
          lines={lines}
          codeBuffer={codeBuffer}
          highlight={highlight}
          streaming={status === "running"}
          title={
            title
              ? `${title.replace(/\s+/g, "_").toLowerCase()}.session`
              : undefined
          }
        />
      </div>
    </div>
  );
}
