"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { ArrowUp, Eraser, LoaderCircle, Mic, Square } from "lucide-react";
import { ExperimentScript } from "@/components/experiment/ExperimentScript";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  playExperimentAudio,
  requestExperimentLesson,
  requestExperimentListen,
  requestExperimentReact,
  requestExperimentSpeak,
} from "@/lib/experiment/client";
import { gradeAnswer } from "@/lib/experiment/grade";
import type {
  ExperimentCheck,
  ExperimentLesson,
} from "@/lib/experiment/scene";
import { toUserFacingError } from "@/lib/errors/userFacing";
import type { ExperimentDrawSession } from "@/components/experiment/applyScene";
import { visibleLessonGraph } from "@/lib/experiment/graph";

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

type Phase = "idle" | "planning" | "playing" | "paused" | "reacting";

/**
 * Full-viewport tldraw whiteboard plus a right-hand teaching script.
 */
export function ExperimentBoard() {
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

  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [lesson, setLesson] = useState<ExperimentLesson | null>(null);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [pausedCheck, setPausedCheck] = useState<ExperimentCheck | null>(null);
  const [note, setNote] = useState("");
  const [voiceReady, setVoiceReady] = useState(false);
  const [listening, setListening] = useState(false);
  const [topic, setTopic] = useState("");

  const busy =
    phase === "planning" || phase === "playing" || phase === "reacting";

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
    return () => {
      alive = false;
      abortRef.current?.abort();
      stopMic();
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

    try {
      const next = await requestExperimentLesson(text, ac.signal);
      if (ac.signal.aborted) return;
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

  async function toggleMic() {
    if (!voiceReady || phase !== "paused") return;
    if (listening) {
      stopMic();
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
            setDraft(transcript);
            await submitAnswer(transcript);
          } catch (caught) {
            setError(
              toUserFacingError(caught, "Couldn't hear that. Try again."),
            );
          }
        })();
      };
      recorder.start();
      setListening(true);
      window.setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state === "recording") {
          recorder.stop();
        }
      }, 8000);
    } catch {
      setError("Could not start the microphone. Try again.");
    }
  }

  const Tldraw = TldrawComp;
  const placeholder =
    phase === "paused" ? "Type or speak your answer…" : "Ask a question…";
  const graph =
    lesson && currentBeat >= 0
      ? visibleLessonGraph(lesson.beats, currentBeat)
      : null;

  return (
    <div className="experiment-board fixed inset-0 flex bg-board">
      <div className="relative h-full min-h-0 min-w-0 flex-1">
        {Tldraw ? (
          <div
            className={`absolute inset-0 ${graph ? "invisible pointer-events-none" : ""}`}
            aria-hidden={Boolean(graph)}
          >
            <Tldraw
              hideUi
              persistenceKey="seethrough-experiment"
              onMount={(editor) => {
                editorRef.current = editor;
                editor.selectNone();
                editor.setCurrentTool("hand");
              }}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center font-sans text-sm text-muted">
            Loading whiteboard…
          </div>
        )}

        {graph ? (
          <div className="absolute inset-0 z-10 flex bg-board px-5 pt-14 pb-[7.25rem]">
            <div className="min-h-0 min-w-0 flex-1">
              <ExperimentGraphPlot graph={graph} />
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute top-3 left-3 z-30">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearBoard}
            className="pointer-events-auto h-8 gap-1.5 rounded-xl border-board-edge bg-white/95 px-2.5 text-[13px] text-ink shadow-[0_8px_20px_rgba(26,43,60,0.08)] backdrop-blur-sm"
          >
            <Eraser className="size-3.5" />
            Clear
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
                className="mb-2 rounded-xl bg-white/90 px-3 py-2 text-center text-[13px] text-error shadow-[0_8px_20px_rgba(26,43,60,0.08)]"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            {busy && status ? (
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
            <div className="flex items-center gap-2 rounded-2xl border border-board-edge bg-white/95 p-1.5 shadow-[0_12px_32px_rgba(26,43,60,0.12)] backdrop-blur-sm">
              <label htmlFor="experiment-prompt" className="sr-only">
                {phase === "paused" ? "Answer" : "Question"}
              </label>
              {phase === "paused" && voiceReady ? (
                <Button
                  type="button"
                  size="icon-sm"
                  variant={listening ? "default" : "ghost"}
                  aria-label={listening ? "Stop listening" : "Answer with voice"}
                  aria-pressed={listening}
                  onClick={() => void toggleMic()}
                  className="size-9 rounded-xl"
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
                className="h-10 min-w-0 flex-1 border-0 bg-transparent px-3 text-[15px] shadow-none focus-visible:ring-0"
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
                className="size-9 rounded-xl"
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

      <div className="h-full w-[min(22rem,38vw)] shrink-0">
        <ExperimentScript
          lesson={lesson}
          currentBeat={currentBeat}
          streaming={phase === "playing" || phase === "planning"}
          pausedCheck={pausedCheck}
          note={note}
        />
      </div>
    </div>
  );
}
