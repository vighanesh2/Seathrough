"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUp, Circle, Eraser, LayoutGrid, LoaderCircle, Mic, Square } from "lucide-react";
import { ExperimentScript } from "@/components/experiment/ExperimentScript";
import { SystemDesignIntakeForm } from "@/components/experiment/SystemDesignIntakeForm";
import { BoxesLoader } from "@/components/ui/BoxesLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/AuthProvider";
import {
  playExperimentAudio,
  requestExperimentLesson,
  requestExperimentListen,
  requestExperimentReact,
  requestExperimentSpeak,
  setExperimentAudioTap,
  uploadSavedLessonVideo,
} from "@/lib/experiment/client";
import { gradeAnswer } from "@/lib/experiment/grade";
import type {
  ExperimentCheck,
  ExperimentLesson,
} from "@/lib/experiment/scene";
import { toUserFacingError } from "@/lib/errors/userFacing";
import type { ExperimentDrawSession } from "@/components/experiment/applyScene";
import { visibleLessonGraph } from "@/lib/experiment/graph";
import { fallbackLessonTitle } from "@/lib/experiment/lessonTitle";
import type { IntakeAnswers, SystemDesignIntake } from "@/lib/experiment/systemDesign/sections";
import { saveLocalVideo } from "@/lib/experiment/localSavedVideos";
import {
  createLessonAudioTap,
  startScreenRecording,
  stopScreenRecording,
  type LessonAudioTap,
  type ScreenRecordSession,
} from "@/components/experiment/screenRecorder";

const ExperimentGraphPlot = dynamic(
  () =>
    import("@/components/experiment/ExperimentGraphPlot").then(
      (mod) => mod.ExperimentGraphPlot,
    ),
  { ssr: false },
);

const PLAN_PHRASES = [
  "Reading your question",
  "Writing the next step",
  "Drawing on the board",
] as const;

type Phase = "idle" | "planning" | "playing" | "paused" | "reacting" | "intake";

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
  }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

/**
 * Full-viewport tldraw whiteboard plus a right-hand teaching script.
 */
export function ExperimentBoard({
  kind = "tutor",
}: {
  kind?: "tutor" | "system";
} = {}) {
  const { accessToken } = useAuth();
  const [TldrawComp, setTldrawComp] = useState<
    typeof import("tldraw").Tldraw | null
  >(null);
  const editorRef = useRef<import("tldraw").Editor | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionRef = useRef<ExperimentDrawSession | null>(null);
  const lessonRef = useRef<ExperimentLesson | null>(null);
  const indexRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const draftRef = useRef("");
  const captureRef = useRef<HTMLDivElement | null>(null);
  const screenRef = useRef<(ScreenRecordSession & { tap: LessonAudioTap }) | null>(
    null,
  );

  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [lesson, setLesson] = useState<ExperimentLesson | null>(null);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [pausedCheck, setPausedCheck] = useState<ExperimentCheck | null>(null);
  const [note, setNote] = useState("");
  const [voiceReady, setVoiceReady] = useState(false);
  const [browserStt, setBrowserStt] = useState(false);
  const [listening, setListening] = useState(false);
  const [topic, setTopic] = useState("");
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [intake, setIntake] = useState<SystemDesignIntake | null>(null);
  const [designPrompt, setDesignPrompt] = useState("");

  const busy =
    phase === "planning" ||
    phase === "playing" ||
    phase === "reacting" ||
    saving;
  const boardWaiting =
    !TldrawComp || phase === "planning" || phase === "reacting";
  const canDictate = voiceReady || browserStt;
  phaseRef.current = phase;
  draftRef.current = draft;

  useEffect(() => {
    let alive = true;
    void (async () => {
      await import("tldraw/tldraw.css");
      const mod = await import("tldraw");
      if (alive) setTldrawComp(() => mod.Tldraw);
    })();
    void fetch("/api/health")
      .then((res) => res.json())
      .then((body: { services?: { deepgram?: boolean } }) => {
        if (alive) setVoiceReady(Boolean(body.services?.deepgram));
      })
      .catch(() => {
        if (alive) setVoiceReady(false);
      });
    setBrowserStt(
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window,
    );
    return () => {
      alive = false;
      abortRef.current?.abort();
      stopMic();
      const rec = screenRef.current;
      screenRef.current = null;
      setExperimentAudioTap(null);
      rec?.stream.getTracks().forEach((track) => track.stop());
      if (rec && rec.recorder.state !== "inactive") {
        try {
          rec.recorder.stop();
        } catch {
          /* unmounting */
        }
      }
    };
  }, []);

  useEffect(() => {
    if (phase !== "planning" && phase !== "reacting") return;
    let i = 0;
    setStatus(PLAN_PHRASES[0]);
    const timer = window.setInterval(() => {
      i = (i + 1) % PLAN_PHRASES.length;
      setStatus(PLAN_PHRASES[i]!);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [phase]);

  function stopMic() {
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recognitionRef.current = null;
    setListening(false);
  }

  function clearBoard() {
    abortRef.current?.abort();
    abortRef.current = null;
    stopMic();
    const editor = editorRef.current;
    if (editor) {
      try {
        const ids = [...editor.getCurrentPageShapeIds()];
        if (ids.length) editor.deleteShapes(ids);
      } catch {
        /* board may already be empty */
      }
    }
    sessionRef.current = null;
    lessonRef.current = null;
    indexRef.current = 0;
    setLesson(null);
    setCurrentBeat(-1);
    setPausedCheck(null);
    setNote("");
    setError("");
    setStatus("");
    setPhase("idle");
    setTopic("");
    setDraft("");
    setIntake(null);
    setDesignPrompt("");
  }

  function onPromptKey(event: KeyboardEvent<HTMLElement>) {
    event.stopPropagation();
  }

  async function speakLine(text: string, signal: AbortSignal) {
    if (!voiceReady || !text.trim()) return;
    try {
      const spoken = await requestExperimentSpeak(text, signal);
      if (!spoken || signal.aborted) return;
      await playExperimentAudio(spoken, signal);
    } catch {
      /* script is still visible */
    }
  }

  async function playFrom(start: number, ac: AbortController) {
    const editor = editorRef.current;
    const current = lessonRef.current;
    const session = sessionRef.current;
    if (!editor || !current || !session) return;

    const { playExperimentBeat } = await import(
      "@/components/experiment/applyScene"
    );

    for (let index = start; index < current.beats.length; index += 1) {
      if (ac.signal.aborted) return;
      indexRef.current = index;
      setCurrentBeat(index);
      setPhase("playing");
      const beat = current.beats[index]!;
      const lookOnly = /^look at the board\.?$/i.test(beat.say.trim());
      const speech = lookOnly
        ? Promise.resolve()
        : speakLine(beat.say, ac.signal);
      await playExperimentBeat(editor, beat, session);
      await speech;
      if (ac.signal.aborted) return;
      if (beat.check) {
        setPausedCheck(beat.check);
        setPhase("paused");
        setStatus("");
        const ask = beat.check.ask.trim();
        const alreadySaid =
          ask.localeCompare(beat.say.trim(), undefined, {
            sensitivity: "accent",
          }) === 0;
        if (!alreadySaid) await speakLine(ask, ac.signal);
        return;
      }
    }
    setPausedCheck(null);
    setPhase("idle");
    setStatus("");
    setCurrentBeat(Math.max(0, current.beats.length - 1));
  }

  async function onPromptSubmit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    if (phase === "paused") {
      await submitAnswer(text);
      return;
    }
    await startLesson(text);
  }

  async function startLesson(text: string) {
    const editor = editorRef.current;
    if (!editor) {
      setError("The board is still loading. Try again in a moment.");
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    stopMic();

    setPhase("planning");
    setError("");
    setDraft("");
    setLesson(null);
    lessonRef.current = null;
    setCurrentBeat(-1);
    setPausedCheck(null);
    setNote("");
    setTopic(text);
    setIntake(null);
    setDesignPrompt("");

    try {
      const result = await requestExperimentLesson(text, ac.signal, undefined, kind);
      if (ac.signal.aborted) return;
      if (result.kind === "intake") {
        setIntake(result.intake);
        setDesignPrompt(text);
        setPhase("intake");
        setStatus("");
        return;
      }
      const next = result.lesson;
      lessonRef.current = next;
      setLesson(next);
      const { prepareExperimentSession } = await import(
        "@/components/experiment/applyScene"
      );
      sessionRef.current = prepareExperimentSession(editor, next);
      await playFrom(0, ac);
    } catch (caught) {
      if (
        ac.signal.aborted ||
        (caught instanceof DOMException && caught.name === "AbortError")
      ) {
        return;
      }
      setDraft(text);
      setPhase("idle");
      setError(
        toUserFacingError(
          caught,
          "Could not explain that. Try another question.",
        ),
      );
    }
  }

  async function submitDesign(answers: IntakeAnswers) {
    const editor = editorRef.current;
    const prompt = designPrompt.trim();
    if (!editor || !prompt) return;
    if (Object.values(answers).some((value) => !value.trim())) {
      setError("Answer all four questions.");
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setPhase("planning");
    setError("");
    setStatus("Designing the system");

    try {
      const result = await requestExperimentLesson(prompt, ac.signal, answers, kind);
      if (ac.signal.aborted) return;
      if (result.kind !== "lesson") {
        throw new Error("Could not design that system. Try again.");
      }
      setIntake(null);
      lessonRef.current = result.lesson;
      setLesson(result.lesson);
      const { prepareExperimentSession } = await import(
        "@/components/experiment/applyScene"
      );
      sessionRef.current = prepareExperimentSession(editor, result.lesson);
      await playFrom(0, ac);
    } catch (caught) {
      if (
        ac.signal.aborted ||
        (caught instanceof DOMException && caught.name === "AbortError")
      ) {
        return;
      }
      setPhase("intake");
      setError(
        toUserFacingError(caught, "Could not design that system. Try again."),
      );
    }
  }

  async function submitAnswer(answer: string) {
    const check = pausedCheck;
    const current = lessonRef.current;
    const ac = abortRef.current;
    if (!check || !current || !ac || busy) return;
    const text = answer.trim();
    if (!text) {
      setError("An answer is required.");
      return;
    }

    setError("");
    setDraft("");
    setPhase("reacting");
    setStatus("Checking your answer");

    try {
      const local = gradeAnswer(text, check.expect);
      const followup =
        local === "continue"
          ? {
              verdict: "continue" as const,
              say: "That's it. Let's keep going.",
              lesson: { title: current.title, beats: [] },
            }
          : await requestExperimentReact(
              {
                topic,
                title: current.title,
                ask: check.ask,
                expect: check.expect,
                answer: text,
                lastSay: current.beats[indexRef.current]?.say ?? "",
              },
              ac.signal,
            );

      if (ac.signal.aborted) return;
      setNote(followup.say);
      setPausedCheck(null);
      await speakLine(followup.say, ac.signal);

      if (followup.lesson.beats.length) {
        const merged: ExperimentLesson = {
          ...current,
          beats: [
            ...current.beats.slice(0, indexRef.current + 1),
            ...followup.lesson.beats,
            ...current.beats.slice(indexRef.current + 1),
          ],
        };
        lessonRef.current = merged;
        setLesson(merged);
      }

      await playFrom(indexRef.current + 1, ac);
    } catch (caught) {
      if (
        ac.signal.aborted ||
        (caught instanceof DOMException && caught.name === "AbortError")
      ) {
        return;
      }
      setPhase("paused");
      setDraft(text);
      setError(
        toUserFacingError(
          caught,
          "Could not explain that. Try another question.",
        ),
      );
    }
  }

  async function skipCheck() {
    if (phase !== "paused" || !abortRef.current) return;
    setPausedCheck(null);
    setNote("We'll keep going.");
    await playFrom(indexRef.current + 1, abortRef.current);
  }

  async function persistRecording(file: {
    blob: Blob;
    mimeType: string;
    durationMs: number;
    poster?: Blob;
  }) {
    const current = lessonRef.current ?? {
      title: topic.trim() || "Screen recording",
      ...(topic.trim() ? { question: topic.trim() } : {}),
      beats: [{ say: "Recorded from Smart tutor.", shapes: [] }],
    };
    if (accessToken) {
      try {
        await uploadSavedLessonVideo({
          video: file.blob,
          poster: file.poster,
          lesson: current,
          durationMs: file.durationMs,
          accessToken,
        });
        setNote("Saved. Open Dashboard to watch it.");
        return;
      } catch {
        /* keep a local copy */
      }
    }
    await saveLocalVideo({
      title: fallbackLessonTitle(current),
      titleSource: "lesson",
      question: current.question,
      durationMs: file.durationMs,
      mimeType: file.mimeType,
      video: file.blob,
      poster: file.poster,
    });
    setNote(
      accessToken
        ? "Saved on this device. Sign in to keep it saved to your account."
        : "Saved on this device. Open Dashboard to watch it.",
    );
  }

  async function stopRecording() {
    const session = screenRef.current;
    if (!session) {
      setRecording(false);
      setExperimentAudioTap(null);
      return;
    }
    screenRef.current = null;
    setRecording(false);
    setSaving(true);
    try {
      const file = await stopScreenRecording(session);
      await persistRecording(file);
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) {
        setError(
          toUserFacingError(caught, "Could not save that recording. Try again."),
        );
      }
    } finally {
      setExperimentAudioTap(null);
      void session.tap.context.close().catch(() => undefined);
      setSaving(false);
    }
  }

  async function startRecording() {
    if (recording || saving || screenRef.current) return;
    setError("");
    try {
      const tap = createLessonAudioTap();
      await tap.context.resume().catch(() => undefined);
      setExperimentAudioTap(tap);
      const session = await startScreenRecording(tap);
      screenRef.current = { ...session, tap };
      setRecording(true);
      setNote("Recording. Click Stop when the lesson is done.");
      const video = session.stream.getVideoTracks()[0];
      video?.addEventListener("ended", () => {
        if (screenRef.current) void stopRecording();
      });
    } catch (caught) {
      setExperimentAudioTap(null);
      const name = caught instanceof DOMException ? caught.name : "";
      if (name === "NotAllowedError") {
        setError("Recording was cancelled. Click Record and share this tab.");
        return;
      }
      setError(
        toUserFacingError(
          caught,
          "Could not start recording. Click Record and share this tab.",
        ),
      );
    }
  }

  async function applyTranscript(transcript: string) {
    const text = transcript.trim();
    if (!text) {
      setError("Couldn't hear that. Try again.");
      return;
    }
    setDraft(text);
    if (phaseRef.current === "paused") {
      await submitAnswer(text);
      return;
    }
    if (phaseRef.current === "idle") {
      await startLesson(text);
    }
  }

  function startBrowserDictation() {
    const SpeechCtor = (window as Window & {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    }).SpeechRecognition ??
      (window as Window & {
        webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
      }).webkitSpeechRecognition;
    if (!SpeechCtor) {
      setError("Voice is not available in this browser.");
      return;
    }
    const recognition = new SpeechCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i]?.[0]?.transcript ?? "";
      }
      setDraft(text);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setListening(false);
      setError("Couldn't hear that. Try again.");
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      const text = draftRef.current.trim();
      if (text) void applyTranscript(text);
    };
    recognition.start();
    setListening(true);
    setError("");
  }

  async function toggleMic() {
    if (!canDictate || busy) return;
    if (listening) {
      stopMic();
      return;
    }
    if (!voiceReady) {
      startBrowserDictation();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setListening(false);
        if (!blob.size) return;
        void (async () => {
          try {
            const transcript = await requestExperimentListen(
              blob,
              abortRef.current?.signal,
            );
            await applyTranscript(transcript);
          } catch (caught) {
            setError(
              toUserFacingError(caught, "Couldn't hear that. Try again."),
            );
          }
        })();
      };
      recorder.start();
      setListening(true);
      setError("");
      window.setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state === "recording") {
          recorder.stop();
        }
      }, 10000);
    } catch {
      setError("Could not start the microphone. Try again.");
    }
  }

  const Tldraw = TldrawComp;
  const placeholder = listening
    ? "Listening…"
    : phase === "paused"
      ? "Type or speak your answer…"
      : kind === "system"
        ? "Describe a system, like a chat app or a URL shortener…"
        : "Ask a question or tap the mic…";
  const graph =
    lesson && currentBeat >= 0
      ? visibleLessonGraph(lesson.beats, currentBeat)
      : null;

  return (
    <div className="experiment-board fixed inset-0 flex bg-board">
      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref={captureRef}
          className="relative flex min-h-0 min-w-0 flex-1 flex-col"
        >
          {graph ? (
            <div className="relative z-10 h-[min(42vh,360px)] shrink-0 px-4 pt-12 pb-2">
              <ExperimentGraphPlot graph={graph} />
            </div>
          ) : null}

          <div className="relative min-h-0 flex-1">
            {Tldraw ? (
              <Tldraw
                hideUi
                persistenceKey={kind === "system" ? "seethrough-system-design" : "seethrough-experiment"}
                onMount={(editor) => {
                  editorRef.current = editor;
                  editor.selectNone();
                  editor.setCurrentTool("hand");
                }}
              />
            ) : null}
            {saving ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/55">
                <BoxesLoader label="Saving recording" />
              </div>
            ) : boardWaiting ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <BoxesLoader
                  label={
                    !Tldraw
                      ? "Loading whiteboard"
                      : status || "Drawing on the board"
                  }
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="pointer-events-none absolute top-3 left-3 z-30 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearBoard}
            className="pointer-events-auto h-8 gap-1.5 rounded-none border-board-edge bg-white/95 px-2.5 text-[13px] text-ink shadow-[0_8px_20px_rgba(26,43,60,0.08)] backdrop-blur-sm"
          >
            <Eraser className="size-3.5" />
            Clear
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (recording) void stopRecording();
              else void startRecording();
            }}
            disabled={saving}
            aria-pressed={recording}
            aria-label={recording ? "Stop recording" : "Start recording"}
            className="pointer-events-auto h-8 gap-1.5 rounded-none border-board-edge bg-white/95 px-2.5 text-[13px] text-ink shadow-[0_8px_20px_rgba(26,43,60,0.08)] backdrop-blur-sm disabled:opacity-50"
          >
            {recording ? (
              <>
                <span className="record-dot" aria-hidden />
                Stop
              </>
            ) : (
              <>
                <Circle className="size-3.5 fill-[#c24545] text-[#c24545]" />
                Record
              </>
            )}
          </Button>
        </div>
        <div className="pointer-events-none absolute top-3 right-3 z-30">
          <Button
            asChild
            type="button"
            variant="outline"
            size="sm"
            className="pointer-events-auto h-8 gap-1.5 rounded-none border-board-edge bg-white/95 px-2.5 text-[13px] text-ink shadow-[0_8px_20px_rgba(26,43,60,0.08)] backdrop-blur-sm"
          >
            <Link href="/dashboard">
              <LayoutGrid className="size-3.5" />
              Dashboard
            </Link>
          </Button>
        </div>

        <form
          className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(event) => void onPromptSubmit(event)}
          onKeyDown={onPromptKey}
          onKeyUp={onPromptKey}
        >
          <div className="pointer-events-auto w-full max-w-[34rem]">
            {error ? (
              <p
                className="mb-2 rounded-none bg-white/90 px-3 py-2 text-center text-[13px] text-error shadow-[0_8px_20px_rgba(26,43,60,0.08)]"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            {busy && status && !boardWaiting ? (
              <p className="mb-2 text-center text-[12px] text-muted">
                {status}
              </p>
            ) : null}
            {phase === "paused" ? (
              <div className="mb-2 flex justify-center">
                <button
                  type="button"
                  className="text-[12px] text-muted underline-offset-2 hover:underline"
                  onClick={() => void skipCheck()}
                >
                  Skip this check
                </button>
              </div>
            ) : null}
            <div className="flex items-center gap-2 rounded-none border border-board-edge bg-white/95 p-1.5 shadow-[0_12px_32px_rgba(26,43,60,0.12)] backdrop-blur-sm">
              <label htmlFor="experiment-prompt" className="sr-only">
                {phase === "paused" ? "Answer" : "Question"}
              </label>
              {canDictate && !busy ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant={listening ? "default" : "ghost"}
                  aria-label={
                    listening
                      ? "Stop listening"
                      : phase === "paused"
                        ? "Answer with voice"
                        : "Ask with voice"
                  }
                  aria-pressed={listening}
                  onClick={() => void toggleMic()}
                  className="size-9 rounded-none"
                >
                  {listening ? (
                    <Square className="size-3.5" />
                  ) : (
                    <Mic className="size-4" />
                  )}
                </Button>
              ) : null}
              <Input
                id="experiment-prompt"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                disabled={busy}
                maxLength={800}
                className="h-10 min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 text-[15px] shadow-none focus-visible:ring-0"
              />
              <Button
                type="submit"
                size="icon-sm"
                disabled={busy || !draft.trim()}
                aria-label={
                  busy
                    ? "Explaining"
                    : phase === "paused"
                      ? "Submit answer"
                      : "Send"
                }
                className="size-9 rounded-none bg-[#085080] text-white hover:bg-[#083068]"
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <div
        className={`h-full shrink-0 ${
          intake ? "w-[min(22rem,34vw)]" : "w-[min(16rem,26vw)]"
        }`}
      >
        {intake && phase === "intake" ? (
          <SystemDesignIntakeForm
            intake={intake}
            busy={false}
            error={error}
            onSubmit={(answers) => void submitDesign(answers)}
          />
        ) : (
          <ExperimentScript
            lesson={lesson}
            currentBeat={currentBeat}
            streaming={phase === "playing" || phase === "planning"}
            pausedCheck={pausedCheck}
            note={note}
            intro={
              kind === "system"
                ? "Describe a system. Four short questions come first, then the design is drawn on the board."
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
