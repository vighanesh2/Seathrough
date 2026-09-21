"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { TutorMathText } from "@/components/ai-tutor/TutorMathText";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { AppHeader } from "@/components/lms/AppHeader";
import { AppShell } from "@/components/lms/AppShell";
import { ThinkingLoader } from "@/components/ui/ThinkingLoader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuestionAccess } from "@/components/usage/QuestionAccess";
import { TutorVisual } from "@/components/ai-tutor/TutorVisual";
import { answerTutor, resetTutor, startTutor } from "@/lib/ai-tutor/client";
import type { TutorView } from "@/lib/ai-tutor/types";
import { isTutorVisualPlan } from "@/lib/ai-tutor/visualPlan";

const WAIT_PHRASES = [
  "Looking at your idea",
  "Choosing a picture",
  "Drawing it",
  "Almost ready",
] as const;

const START_PHRASES = [
  "Getting ready",
  "Finding a first question",
  "Almost there",
] as const;

function realText(value?: string) {
  const cleaned = (value || "").trim();
  if (!cleaned) return "";
  const blank = cleaned.toLowerCase().replace(/[.?!]+$/, "");
  if (
    blank === "none" ||
    blank === "n/a" ||
    blank === "na" ||
    blank === "-" ||
    blank === "null" ||
    blank === "nil"
  ) {
    return "";
  }
  return cleaned;
}

function helpfulMessage(view: TutorView | null, hasVisual: boolean) {
  if (!view?.message) return "";
  const text = view.message.trim();
  if (!text) return "";
  if (/share what you think/i.test(text)) return "";
  if (/look at the picture/i.test(text) && !hasVisual) return "";
  return text;
}

export function TutorWorkspace() {
  const { user } = useAuth();
  const { openAuth, beginQuestion, cancelQuestion } = useQuestionAccess();
  const [view, setView] = useState<TutorView | null>(null);
  const [topicDraft, setTopicDraft] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const topicRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const charged = useRef(false);

  const inLesson = Boolean(view?.sessionId);

  useEffect(() => {
    if (!inLesson) {
      topicRef.current?.focus();
      return;
    }
    boxRef.current?.focus();
  }, [inLesson, view?.question]);

  async function onStart(event?: React.FormEvent) {
    event?.preventDefault();
    const topic = topicDraft.trim();
    if (!topic || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await startTutor(topic);
      setView(next);
      setDraft("");
      charged.current = false;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not start the tutor.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || busy || !view?.sessionId || view.onTrack) return;
    if (!charged.current) {
      if (!beginQuestion()) return;
      charged.current = true;
    }
    setBusy(true);
    setError("");
    try {
      const next = await answerTutor(view.sessionId, text);
      setView(next);
      setDraft("");
      if (next.error) setError(next.error);
    } catch (caught) {
      if (charged.current && !view.hasVisual) {
        cancelQuestion();
        charged.current = false;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "The tutor could not continue.",
      );
    } finally {
      setBusy(false);
      boxRef.current?.focus();
    }
  }

  async function onReset() {
    setBusy(true);
    setError("");
    try {
      await resetTutor(view?.sessionId);
    } catch {
      // Still return to the entry screen.
    } finally {
      charged.current = false;
      setView(null);
      setDraft("");
      setTopicDraft("");
      setBusy(false);
    }
  }

  const visual = view?.visualHtml || "";
  const plan = isTutorVisualPlan(view?.visualPlan) ? view!.visualPlan! : null;
  const hasVisual = Boolean(plan || visual);
  const onTrack = Boolean(view?.onTrack);
  const confused = realText(view?.confused);
  const wrongModel = realText(view?.wrongModel);
  const noticed = Boolean(confused);
  const message = helpfulMessage(view, hasVisual);
  const answeredOnce = (view?.turns?.length ?? 0) > 0;

  const account = (
    <AccountMenu
      onLogin={() => openAuth("login")}
      onSignup={() => openAuth("signup")}
    />
  );

  if (!inLesson) {
    return (
      <AppShell>
        <div className="flex min-h-0 flex-1 flex-col">
          <AppHeader current="ai-tutor" account={account} />

          <main className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,rgba(27,108,168,0.10),transparent_55%)]"
            />
            <form onSubmit={onStart} className="relative w-full max-w-xl">
              <h1 className="font-[family-name:var(--font-newsreader)] text-center text-[2.15rem] leading-tight tracking-tight text-ink sm:text-[2.6rem]">
                What do you want to learn?
              </h1>

              <div className="mt-8 rounded-2xl border border-board-edge bg-white/95 p-2 shadow-[0_18px_40px_rgba(26,43,60,0.07)]">
                <label htmlFor="tutor-topic" className="sr-only">
                  Topic to learn
                </label>
                <Textarea
                  id="tutor-topic"
                  ref={topicRef}
                  value={topicDraft}
                  disabled={busy}
                  onChange={(event) => setTopicDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void onStart();
                    }
                  }}
                  placeholder="e.g. the chain rule, recursion, how photosynthesis works…"
                  className="min-h-[96px] resize-none border-0 bg-transparent px-3 py-3 text-[16px] shadow-none focus-visible:ring-0"
                />
                <div className="flex items-center justify-between gap-3 px-2 pb-1">
                  <p className="text-[12px] text-muted">
                    {user ? "Enter to start" : "A few free questions each day"}
                  </p>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={busy || !topicDraft.trim()}
                  >
                    Start
                    <ArrowUp className="size-3.5" />
                  </Button>
                </div>
              </div>

              {error ? (
                <p className="mt-4 text-center text-sm text-error" role="alert">
                  {error}
                </p>
              ) : null}
            </form>

            {busy ? (
              <ThinkingLoader
                variant="overlay"
                phrases={START_PHRASES}
                className="rounded-none"
              />
            ) : null}
          </main>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <AppHeader
          current="ai-tutor"
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted"
              onClick={() => void onReset()}
              disabled={busy}
            >
              <RotateCcw className="size-3.5" />
              New
            </Button>
          }
          account={account}
        />

        <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(27,108,168,0.08),transparent_52%)]"
          />

          <div className="relative w-full max-w-xl">
            {hasVisual ? (
              <div className="mb-6 overflow-hidden rounded-2xl border border-board-edge bg-white p-4 shadow-[0_14px_32px_rgba(26,43,60,0.06)]">
                {plan ? (
                  <TutorVisual plan={plan} />
                ) : (
                  <iframe
                    title="Lesson picture"
                    sandbox="allow-scripts"
                    srcDoc={visual}
                    className="h-[min(42vh,320px)] w-full border-0 bg-[#f4efe6]"
                  />
                )}
              </div>
            ) : null}

            {onTrack ? (
              <div className="mb-6 rounded-2xl bg-success-soft px-5 py-4 text-center">
                <p className="text-[15px] font-semibold text-success">
                  You are on track
                </p>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
                  You used the right idea on a new question.
                </p>
              </div>
            ) : null}

            <TutorMathText
              as="p"
              className="text-center font-[family-name:var(--font-newsreader)] text-[1.65rem] leading-snug tracking-tight text-ink sm:text-[1.9rem]"
              text={view?.question || "Starting…"}
            />

            {message ? (
              <TutorMathText
                as="p"
                className="mx-auto mt-3 max-w-md text-center text-[15px] leading-6 text-ink-soft"
                text={message}
              />
            ) : null}

            {noticed && answeredOnce && !onTrack ? (
              <div className="mt-5 space-y-2 rounded-2xl bg-white/90 px-4 py-3 text-sm leading-6 text-ink-soft shadow-[0_10px_28px_rgba(26,43,60,0.05)]">
                {confused ? (
                  <p>
                    Mix-up: <TutorMathText text={confused} />
                  </p>
                ) : null}
                {wrongModel ? (
                  <p>
                    Your model: <TutorMathText text={wrongModel} />
                  </p>
                ) : null}
              </div>
            ) : null}

            {error ? (
              <p className="mt-4 text-center text-sm text-error" role="alert">
                {error}
              </p>
            ) : null}

            {!onTrack ? (
              <form onSubmit={onSubmit} className="mt-8">
                <div className="rounded-2xl border border-board-edge bg-white/95 p-2 shadow-[0_18px_40px_rgba(26,43,60,0.07)]">
                  <label htmlFor="tutor-answer" className="sr-only">
                    Your answer
                  </label>
                  <Textarea
                    id="tutor-answer"
                    ref={boxRef}
                    value={draft}
                    disabled={busy || !view?.sessionId}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void onSubmit();
                      }
                    }}
                    placeholder="Type your answer…"
                    className="min-h-[96px] resize-none border-0 bg-transparent px-3 py-3 text-[16px] shadow-none focus-visible:ring-0"
                  />
                  <div className="flex items-center justify-between gap-3 px-2 pb-1">
                    <p className="text-[12px] text-muted">
                      {user ? "Enter to send" : "A few free questions each day"}
                    </p>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={busy || !draft.trim() || !view?.sessionId}
                    >
                      Send
                      <ArrowUp className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="mt-8 flex justify-center">
                <Button type="button" onClick={() => void onReset()}>
                  Learn something else
                </Button>
              </div>
            )}
          </div>

          {busy ? (
            <ThinkingLoader
              variant="overlay"
              phrases={WAIT_PHRASES}
              className="rounded-none"
            />
          ) : null}
        </main>
      </div>
    </AppShell>
  );
}
