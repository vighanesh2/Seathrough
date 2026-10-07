"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BrowserChrome } from "@/components/browser-experience/BrowserChrome";
import {
  BoardNarration,
  type BoardNarrationLine,
} from "@/components/board/BoardNarration";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { AppHeader } from "@/components/lms/AppHeader";
import { AppShell } from "@/components/lms/AppShell";
import { PromptBar } from "@/components/PromptBar";
import { Button } from "@/components/ui/button";
import { useQuestionAccess } from "@/components/usage/QuestionAccess";
import {
  annotateBrowserSession,
  closeBrowserSession,
  fetchBrowserFrame,
  requestBrowserAsk,
  requestBrowserFollowUp,
  speakBrowserLine,
} from "@/lib/browser-experience/client";
import { isFollowUpPrompt } from "@/lib/browser-experience/followUp";
import type {
  BrowserSessionPublic,
  BrowserStreamEvent,
  BrowserTeachBeat,
} from "@/lib/browser-experience/types";
import { toUserFacingError } from "@/lib/errors/userFacing";

type Phase = "idle" | "working" | "teaching" | "ready" | "error";

function statusMessage(
  status: BrowserSessionPublic["status"] | null,
  fallback: string,
): string {
  switch (status) {
    case "starting":
      return "Starting a private browser…";
    case "searching":
      return "Searching for a clear learning page…";
    case "opening_search":
      return "Opening Google search…";
    case "opening_source":
      return "Opening the best learning page…";
    case "reading":
      return "Reading the page…";
    case "teaching":
      return "Walking you through it…";
    case "ready":
      return "Ask a follow-up about this page, or a new topic to search again.";
    case "error":
      return "Something went wrong in the browser session.";
    default:
      return fallback;
  }
}

function playAudio(
  mimeType: string,
  base64: string,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:${mimeType};base64,${base64}`);
    const onAbort = () => {
      audio.pause();
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    audio.onended = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    audio.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    };
    void audio.play().catch(() => resolve());
  });
}

export function BrowserExperienceWorkspace() {
  const { logout } = useAuth();
  const { beginQuestion, cancelQuestion, openAuth } = useQuestionAccess();

  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusLine, setStatusLine] = useState(
    "Ask a question. We’ll open a page and walk through it with a tutor cursor.",
  );
  const [session, setSession] = useState<BrowserSessionPublic | null>(null);
  const [activeBeatId, setActiveBeatId] = useState<string | null>(null);
  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState<BoardNarrationLine[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const teachAbortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const priorQuestionRef = useRef<string>("");
  const submittingRef = useRef(false);
  const noteSeqRef = useRef(0);

  useEffect(() => {
    sessionIdRef.current = session?.id ?? null;
  }, [session?.id]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      teachAbortRef.current?.abort();
      const id = sessionIdRef.current;
      if (id) void closeBrowserSession(id);
    };
  }, []);

  async function refreshFrame(sessionId: string) {
    try {
      const image = await fetchBrowserFrame(sessionId);
      if (image) setFrameDataUrl(image);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!session?.frameStream || !session.id) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const image = await fetchBrowserFrame(session.id);
        if (!cancelled && image) setFrameDataUrl(image);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 650);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [session?.frameStream, session?.id, phase, activeBeatId]);

  function pushNote(text: string, kind: BoardNarrationLine["kind"] = "narration") {
    const cleaned = text.trim();
    if (!cleaned) return;
    noteSeqRef.current += 1;
    const id = `n-${noteSeqRef.current}`;
    setNotes((prev) => [...prev, { id, text: cleaned, kind }]);
  }

  function onStreamEvent(event: BrowserStreamEvent) {
    if (event.type === "status") {
      setStatusLine(event.message || statusMessage(event.status, statusLine));
    }
    if (event.type === "session") {
      setSession(event.session);
      setStatusLine(statusMessage(event.session.status, statusLine));
    }
    if (event.type === "source") {
      setStatusLine(`Opened ${event.source.publisher}: ${event.source.title}`);
    }
    if (event.type === "error") {
      setPhase("error");
      pushNote(event.error, "error");
    }
  }

  async function playBeats(
    sessionId: string,
    nextBeats: BrowserTeachBeat[],
    signal: AbortSignal,
    useFrames: boolean,
    youtubeLesson: boolean,
  ) {
    setPhase("teaching");
    for (const beat of nextBeats) {
      if (signal.aborted) return;
      setActiveBeatId(beat.id);
      setStatusLine(beat.speech);
      pushNote(beat.speech, "narration");

      const kind = beat.annotation.kind;
      const isVideoAction =
        kind === "youtube_play" ||
        kind === "youtube_pause" ||
        kind === "youtube_seek";
      const isClick = kind === "click";

      try {
        await annotateBrowserSession(sessionId, beat.annotation, signal);
      } catch {
        /* keep teaching */
      }

      // Give seek/play/click time to settle before speaking.
      const settleMs = isVideoAction
        ? kind === "youtube_seek"
          ? 1400
          : 1100
        : isClick
          ? 1200
          : useFrames
            ? 400
            : 900;
      await new Promise((r) => setTimeout(r, settleMs));

      if (useFrames) {
        await refreshFrame(sessionId);
        if (!isVideoAction) {
          await new Promise((r) => setTimeout(r, 550));
          await refreshFrame(sessionId);
        }
      }

      // Explain while paused on video frames / after click opens content.
      const spoken = await speakBrowserLine(beat.speech, signal);
      if (spoken) {
        await playAudio(spoken.mimeType, spoken.base64, signal);
      } else {
        await new Promise((r) =>
          setTimeout(r, Math.min(beat.speech.length * 35, 4000)),
        );
      }
      if (signal.aborted) return;

      const hold =
        beat.holdMs ??
        (isVideoAction ? 1200 : isClick ? 1000 : 800);
      await new Promise((r) => setTimeout(r, hold));
    }
    try {
      if (!youtubeLesson) {
        await annotateBrowserSession(sessionId, { kind: "clear" }, signal);
      }
      if (useFrames) await refreshFrame(sessionId);
    } catch {
      /* ignore */
    }
    setActiveBeatId(null);
    setPhase("ready");
    setStatusLine(
      youtubeLesson
        ? "Ask about another moment in this video, or a new topic to search again."
        : "Ask a follow-up about this page, or a new topic to search again.",
    );
  }

  async function submitPrompt() {
    const text = prompt.trim();
    if (
      !text ||
      submittingRef.current ||
      phase === "working" ||
      phase === "teaching"
    ) {
      return;
    }

    if (!beginQuestion()) return;
    submittingRef.current = true;

    abortRef.current?.abort();
    teachAbortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const followUp = isFollowUpPrompt(text, {
      hasReadySession: Boolean(session?.id) && phase === "ready",
      priorQuestion: priorQuestionRef.current || session?.question || "",
    });

    setPhase("working");
    setActiveBeatId(null);
    if (!followUp) {
      noteSeqRef.current = 0;
      setNotes([{ id: "q-1", text, kind: "student" }]);
      setFrameDataUrl(null);
    } else {
      pushNote(text, "student");
    }
    setPrompt("");

    try {
      const result = followUp
        ? await requestBrowserFollowUp(session!.id, text, {
            signal: controller.signal,
            onEvent: onStreamEvent,
          })
        : await requestBrowserAsk(text, {
            sessionId: session?.id,
            signal: controller.signal,
            onEvent: onStreamEvent,
          });

      priorQuestionRef.current = text;
      setSession(result.session);
      if (result.summary) pushNote(result.summary, "summary");

      const teachController = new AbortController();
      teachAbortRef.current = teachController;
      await playBeats(
        result.session.id,
        result.beats,
        teachController.signal,
        result.session.frameStream,
        Boolean(result.session.isYouTube),
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      cancelQuestion();
      setPhase("error");
      pushNote(
        toUserFacingError(
          err,
          "Could not start the browser lesson. Try again.",
        ),
        "error",
      );
    } finally {
      submittingRef.current = false;
    }
  }

  async function endSession() {
    abortRef.current?.abort();
    teachAbortRef.current?.abort();
    if (session?.id) await closeBrowserSession(session.id);
    setSession(null);
    setFrameDataUrl(null);
    setActiveBeatId(null);
    setNotes([]);
    priorQuestionRef.current = "";
    setPhase("idle");
    setStatusLine(
      "Ask a question. We’ll open a page and walk through it with a tutor cursor.",
    );
  }

  const busy = phase === "working" || phase === "teaching";
  const sources = useMemo(
    () => (session?.selectedSource ? [session.selectedSource] : []),
    [session?.selectedSource],
  );

  return (
    <AppShell>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader
          current="browser-experience"
          title="Browser"
          brandCompact
          center={
            <PromptBar
              value={prompt}
              onChange={setPrompt}
              onSubmit={() => void submitPrompt()}
              disabled={busy}
              placeholder={
                session && phase === "ready"
                  ? session.isYouTube
                    ? "Ask about another part of this video, or a new topic…"
                    : "Follow up on this page, or ask a new topic…"
                  : "Ask a page, or “explain this on YouTube”…"
              }
              submitLabel={session && phase === "ready" ? "Ask" : "Search"}
            />
          }
          actions={
            session ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void endSession()}
                className="text-[#5b7388]"
              >
                End session
              </Button>
            ) : null
          }
          account={
            <AccountMenu
              onLogin={() => openAuth("login")}
              onSignup={() => openAuth("signup")}
              onLogout={logout}
            />
          }
        />

        <main className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)]">
          <div className="min-h-0 p-3 md:p-4 md:pr-2">
            <BrowserChrome
              addressBar={session?.addressBar || "about:blank"}
              liveViewUrl={session?.liveViewUrl ?? null}
              frameDataUrl={frameDataUrl}
              frameStream={Boolean(session?.frameStream)}
              statusLabel={
                phase === "working"
                  ? statusLine
                  : session
                    ? statusLine
                    : "Ask a question to open the browser."
              }
            />
          </div>

          <BoardNarration
            title={session?.title || "Follow along"}
            lines={
              notes.length
                ? notes
                : phase === "working"
                  ? [
                      {
                        id: "status",
                        text: statusLine,
                        kind: "narration",
                      },
                    ]
                  : []
            }
            sources={sources}
            streaming={busy}
            placement="side"
          />
        </main>
      </div>
    </AppShell>
  );
}
