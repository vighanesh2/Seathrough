"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { estimateSpeechMs } from "@/lib/orchestrator/speechUnits";
import { inspectSceneCode } from "@/lib/scene-explain/inspectCode";
import {
  MAX_SCENE_REPAIR_ATTEMPTS,
  SCENE_LOAD_TIMEOUT_MS,
  type SceneAgentKind,
  type SceneAgentLine,
  type SceneProgram,
} from "@/lib/scene-explain/types";

type SessionStatus = "idle" | "building" | "fixing" | "explaining" | "error";

export type SceneSessionSnapshot = {
  prompt: string;
  title: string;
  program: SceneProgram;
  code: string;
  reveal: number;
  logs: SceneAgentLine[];
  narration: string[];
};

type GenerateResponse = SceneProgram & { error?: string };
type RepairResponse = { code?: string; error?: string };
type SpeakClip = { mimeType: string; base64: string };

async function postJson<T>(
  url: string,
  token: string | null,
  body: unknown,
  signal: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });
  let data: T & { error?: string };
  try {
    data = (await response.json()) as T & { error?: string };
  } catch {
    throw new Error("The scene agent returned an unreadable response.");
  }
  if (!response.ok) {
    throw new Error(data.error || "The scene agent request failed.");
  }
  return data;
}

async function fetchSpeechClip(
  token: string | null,
  text: string,
  signal: AbortSignal,
): Promise<SpeakClip | null> {
  const spoken = text.trim();
  if (!spoken || signal.aborted) return null;
  try {
    const data = await postJson<SpeakClip>(
      "/api/scene-explain/speak",
      token,
      { text: spoken.slice(0, 900) },
      signal,
    );
    if (!data.mimeType || !data.base64) return null;
    return data;
  } catch {
    return null;
  }
}

function waitMs(ms: number, signal: AbortSignal, timerRef: { current: number | null }): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const id = window.setTimeout(() => {
      timerRef.current = null;
      resolve();
    }, ms);
    timerRef.current = id;
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(id);
        if (timerRef.current === id) timerRef.current = null;
        resolve();
      },
      { once: true },
    );
  });
}

function playClip(
  clip: SpeakClip,
  signal: AbortSignal,
  audioRef: { current: HTMLAudioElement | null },
): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }
    const audio = new Audio(`data:${clip.mimeType};base64,${clip.base64}`);
    audioRef.current = audio;
    let settled = false;
    const finish = (played: boolean) => {
      if (settled) return;
      settled = true;
      audio.onended = null;
      audio.onerror = null;
      if (audioRef.current === audio) audioRef.current = null;
      resolve(played);
    };
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    signal.addEventListener(
      "abort",
      () => {
        audio.pause();
        audio.removeAttribute("src");
        finish(false);
      },
      { once: true },
    );
    void audio.play().catch(() => finish(false));
  });
}

export function useSceneSession(accessToken: string | null) {
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [title, setTitle] = useState<string | undefined>();
  const [code, setCode] = useState<string | null>(null);
  const [reveal, setReveal] = useState(1);
  const [logs, setLogs] = useState<SceneAgentLine[]>([]);
  const [narration, setNarration] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [program, setProgram] = useState<SceneProgram | null>(null);
  const [frameKey, setFrameKey] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const logId = useRef(0);
  const loadGen = useRef(0);
  const loadWaiter = useRef<{
    gen: number;
    resolve: (result: { ok: true; maxReveal: number } | { ok: false; message: string }) => void;
  } | null>(null);
  const playTimer = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voiceWarned = useRef(false);

  const pushLog = useCallback((kind: SceneAgentKind, text: string) => {
    logId.current += 1;
    setLogs((prev) => [...prev, { id: `a-${logId.current}`, kind, text }]);
  }, []);

  const stopPlayback = useCallback(() => {
    if (playTimer.current != null) {
      window.clearTimeout(playTimer.current);
      playTimer.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const waiter = loadWaiter.current;
    loadWaiter.current = null;
    loadGen.current += 1;
    if (waiter) {
      waiter.resolve({ ok: false, message: "Scene reset." });
    }
    stopPlayback();
    setStatus("idle");
    setTitle(undefined);
    setCode(null);
    setReveal(1);
    setLogs([]);
    setNarration([]);
    setError(null);
    setProgram(null);
  }, [stopPlayback]);

  const restore = useCallback(
    (snapshot: {
      title: string;
      program: SceneProgram;
      code: string;
      reveal: number;
      logs: SceneAgentLine[];
      narration: string[];
    }) => {
      abortRef.current?.abort();
      abortRef.current = null;
      const waiter = loadWaiter.current;
      loadWaiter.current = null;
      loadGen.current += 1;
      if (waiter) {
        waiter.resolve({ ok: false, message: "Scene restored." });
      }
      stopPlayback();
      setError(null);
      setStatus("idle");
      setTitle(snapshot.title);
      setProgram(snapshot.program);
      setLogs(snapshot.logs);
      setNarration(snapshot.narration);
      setReveal(snapshot.reveal);
      setCode(snapshot.code);
      setFrameKey((k) => k + 1);
    },
    [stopPlayback],
  );

  useEffect(
    () => () => {
      abortRef.current?.abort();
      const waiter = loadWaiter.current;
      loadWaiter.current = null;
      loadGen.current += 1;
      if (waiter) {
        waiter.resolve({ ok: false, message: "Scene closed." });
      }
      stopPlayback();
    },
    [stopPlayback],
  );

  const onFrameReady = useCallback((maxReveal: number) => {
    const waiter = loadWaiter.current;
    if (!waiter || waiter.gen !== loadGen.current) return;
    waiter.resolve({ ok: true, maxReveal });
    loadWaiter.current = null;
  }, []);

  const onFrameError = useCallback((message: string) => {
    const waiter = loadWaiter.current;
    if (!waiter || waiter.gen !== loadGen.current) return;
    waiter.resolve({ ok: false, message });
    loadWaiter.current = null;
  }, []);

  const waitForFrame = useCallback(
    (nextCode: string, signal: AbortSignal) => {
      const gen = loadGen.current + 1;
      loadGen.current = gen;
      return new Promise<{
        ok: true;
        maxReveal: number;
      } | { ok: false; message: string }>((resolve) => {
        let settled = false;
        const finish = (
          result: { ok: true; maxReveal: number } | { ok: false; message: string },
        ) => {
          if (settled) return;
          settled = true;
          if (loadWaiter.current?.gen === gen) loadWaiter.current = null;
          window.clearTimeout(timer);
          signal.removeEventListener("abort", onAbort);
          resolve(result);
        };

        const onAbort = () => {
          finish({ ok: false, message: "Scene load cancelled." });
        };

        if (signal.aborted) {
          finish({ ok: false, message: "Scene load cancelled." });
          return;
        }

        loadWaiter.current = {
          gen,
          resolve: finish,
        };
        setFrameKey(gen);
        setCode(nextCode);

        const timer = window.setTimeout(() => {
          finish({
            ok: false,
            message: "The 3D scene did not start in time.",
          });
        }, SCENE_LOAD_TIMEOUT_MS);

        signal.addEventListener("abort", onAbort, { once: true });
      });
    },
    [],
  );

  const playBeats = useCallback(
    async (
      next: SceneProgram,
      token: string | null,
      signal: AbortSignal,
      firstClip: Promise<SpeakClip | null> | null,
    ): Promise<string[]> => {
      stopPlayback();
      setNarration([]);
      setReveal(next.beats[0]?.reveal ?? 1);

      let upcoming = firstClip;
      let missingVoice = false;
      const spoken: string[] = [];

      for (let i = 0; i < next.beats.length; i += 1) {
        if (signal.aborted) return spoken;
        const beat = next.beats[i];
        if (!beat) break;

        setReveal(beat.reveal);
        spoken.push(beat.narration);
        setNarration((prev) => [...prev, beat.narration]);

        const clip = upcoming
          ? await upcoming
          : await fetchSpeechClip(token, beat.narration, signal);
        upcoming = next.beats[i + 1]
          ? fetchSpeechClip(token, next.beats[i + 1].narration, signal)
          : null;

        if (signal.aborted) return spoken;

        let heard = false;
        if (clip) {
          heard = await playClip(clip, signal, audioRef);
        }
        if (signal.aborted) return spoken;
        if (!heard) {
          missingVoice = true;
          await waitMs(
            Math.min(18000, Math.max(5000, estimateSpeechMs(beat.narration))),
            signal,
            playTimer,
          );
        }
      }

      if (signal.aborted) return spoken;
      if (missingVoice && !voiceWarned.current) {
        voiceWarned.current = true;
        pushLog(
          "status",
          "Voice couldn’t play — the explanation is still on the right.",
        );
      }
      setStatus("idle");
      return spoken;
    },
    [pushLog, stopPlayback],
  );

  const run = useCallback(
    async (prompt: string): Promise<false | SceneSessionSnapshot> => {
      const trimmed = prompt.trim();
      if (!trimmed) return false;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const abandoned = loadWaiter.current;
      loadWaiter.current = null;
      loadGen.current += 1;
      if (abandoned) {
        abandoned.resolve({ ok: false, message: "Scene load cancelled." });
      }
      stopPlayback();
      setError(null);
      setNarration([]);
      setLogs([]);
      setCode(null);
      setReveal(1);
      setStatus("building");
      voiceWarned.current = false;

      const runLogs: SceneAgentLine[] = [];
      const addLog = (kind: SceneAgentKind, text: string) => {
        logId.current += 1;
        const line = { id: `a-${logId.current}`, kind, text };
        runLogs.push(line);
        setLogs((prev) => [...prev, line]);
      };
      addLog("status", "Planning a 3D scene for that process…");

      const failOrAbort = (message?: string): false => {
        if (controller.signal.aborted || abortRef.current !== controller) {
          setStatus("idle");
          return false;
        }
        if (message) {
          setStatus("error");
          setError(message);
          addLog("error", message);
        } else {
          setStatus("idle");
        }
        return false;
      };

      try {
        const generated = await postJson<GenerateResponse>(
          "/api/scene-explain/generate",
          accessToken,
          {
            prompt: trimmed,
            priorTitle: program?.title,
            priorSummary: program?.beats.map((b) => b.narration).join(" "),
          },
          controller.signal,
        );

        if (controller.signal.aborted) return failOrAbort();

        let current = generated;
        setProgram(current);
        setTitle(current.title);
        addLog("status", `Built a draft of “${current.title}”. Loading it…`);

        for (let attempt = 1; attempt <= MAX_SCENE_REPAIR_ATTEMPTS + 1; attempt += 1) {
          if (controller.signal.aborted) return failOrAbort();

          const inspected = inspectSceneCode(current.code);
          if (!inspected.ok) {
            if (attempt > MAX_SCENE_REPAIR_ATTEMPTS) {
              throw new Error(inspected.reason);
            }
            setStatus("fixing");
            addLog("fix", `${inspected.reason} Asking the agent to rewrite it…`);
            const repaired = await postJson<RepairResponse>(
              "/api/scene-explain/repair",
              accessToken,
              {
                prompt: trimmed,
                title: current.title,
                code: current.code,
                error: inspected.reason,
                attempt,
              },
              controller.signal,
            );
            if (!repaired.code) throw new Error("The fixer returned no scene.");
            current = { ...current, code: repaired.code };
            continue;
          }

          const firstClip = current.beats[0]
            ? fetchSpeechClip(
                accessToken,
                current.beats[0].narration,
                controller.signal,
              )
            : null;
          const loaded = await waitForFrame(current.code, controller.signal);
          if (controller.signal.aborted) return failOrAbort();
          if (loaded.ok) {
            setProgram(current);
            setTitle(current.title);
            setStatus("explaining");
            addLog(
              "ready",
              "Scene is running. Walking through what you’re seeing.",
            );
            const spoken = await playBeats(
              current,
              accessToken,
              controller.signal,
              firstClip,
            );
            if (controller.signal.aborted) return failOrAbort();
            const finalReveal =
              current.beats.at(-1)?.reveal ?? current.maxReveal ?? 1;
            return {
              prompt: trimmed,
              title: current.title,
              program: current,
              code: current.code,
              reveal: finalReveal,
              logs: runLogs,
              narration: spoken,
            };
          }

          if (attempt > MAX_SCENE_REPAIR_ATTEMPTS) {
            throw new Error(loaded.message);
          }
          setStatus("fixing");
          addLog("fix", `Crash: ${loaded.message} Fixing and reloading…`);
          const repaired = await postJson<RepairResponse>(
            "/api/scene-explain/repair",
            accessToken,
            {
              prompt: trimmed,
              title: current.title,
              code: current.code,
              error: loaded.message,
              attempt,
            },
            controller.signal,
          );
          if (!repaired.code) throw new Error("The fixer returned no scene.");
          current = { ...current, code: repaired.code };
        }

        throw new Error("Couldn't get a stable 3D scene. Try a simpler prompt.");
      } catch (err) {
        if (controller.signal.aborted) return failOrAbort();
        const message =
          err instanceof Error ? err.message : "The scene agent failed.";
        return failOrAbort(message);
      }
    },
    [accessToken, playBeats, program, stopPlayback, waitForFrame],
  );

  return {
    status,
    title,
    code,
    frameKey,
    reveal,
    logs,
    narration,
    error,
    program,
    busy: status === "building" || status === "fixing",
    run,
    reset,
    restore,
    onFrameReady,
    onFrameError,
  };
}
