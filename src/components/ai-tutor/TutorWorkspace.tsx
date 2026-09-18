"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { AppHeader } from "@/components/lms/AppHeader";
import { AppShell } from "@/components/lms/AppShell";
import { ThinkingLoader } from "@/components/ui/ThinkingLoader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuestionAccess } from "@/components/usage/QuestionAccess";
import { answerTutor, resetTutor, startTutor } from "@/lib/ai-tutor/client";
import type { TutorView } from "@/lib/ai-tutor/types";
import { cn } from "@/lib/utils";

const WAIT_PHRASES = [
  "Looking at your idea",
  "Choosing a picture",
  "Drawing it",
  "Almost ready",
] as const;

function scoreLabel(score: number, started: boolean) {
  if (!started) return "Just starting";
  if (score >= 100) return "You've got it";
  if (score >= 70) return "Almost there";
  if (score >= 40) return "Getting clearer";
  return "Finding the mix-up";
}

export function TutorWorkspace() {
  const { user } = useAuth();
  const { openAuth, beginQuestion, cancelQuestion } = useQuestionAccess();
  const [view, setView] = useState<TutorView | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [bootFailed, setBootFailed] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const charged = useRef(false);

  const boot = useCallback(async () => {
    setBusy(true);
    setError("");
    setBootFailed(false);
    try {
      const next = await startTutor();
      setView(next);
    } catch (caught) {
      setBootFailed(true);
      setError(caught instanceof Error ? caught.message : "Could not start the tutor.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

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
      setError(caught instanceof Error ? caught.message : "The tutor could not continue.");
    } finally {
      setBusy(false);
      boxRef.current?.focus();
    }
  }

  async function onReset() {
    setBusy(true);
    try {
      await resetTutor(view?.sessionId);
      charged.current = false;
      await boot();
    } finally {
      setBusy(false);
    }
  }

  const started = (view?.turns?.length ?? 0) > 0;
  const score = view?.score ?? 0;
  const visual = view?.visualHtml || "";
  const onTrack = Boolean(view?.onTrack);
  const transfer = view?.phase === "transfer";

  return (
    <AppShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <AppHeader
          current="ai-tutor"
          eyebrow="Guided tutor"
          title={view?.topic || "Let’s figure this out"}
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
          account={
            <AccountMenu
              onLogin={() => openAuth("login")}
              onSignup={() => openAuth("signup")}
            />
          }
        />

        <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row lg:gap-6 lg:p-6">
          <section className="relative flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-3xl border border-board-edge bg-white shadow-[0_16px_40px_rgba(26,43,60,0.06)]">
            {visual ? (
              <iframe
                title="Lesson picture"
                sandbox="allow-scripts"
                srcDoc={visual}
                className="h-full min-h-[280px] w-full flex-1 border-0 bg-[#f4efe6]"
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
                <p className="font-[family-name:var(--font-newsreader)] text-2xl text-ink">
                  A picture will appear here
                </p>
                <p className="max-w-md text-sm leading-6 text-muted">
                  Answer the question on the right. If a mix-up shows up, we draw it
                  so you can press Play and see the difference.
                </p>
              </div>
            )}
            {busy ? (
              <ThinkingLoader
                variant="overlay"
                phrases={WAIT_PHRASES}
                className="rounded-3xl"
              />
            ) : null}
          </section>

          <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[22.5rem]">
            <div className="rounded-2xl border border-board-edge bg-white/90 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
                  Understanding
                </p>
                <p className="text-[13px] font-medium text-ink-soft">
                  {scoreLabel(score, started)}
                  {started ? ` · ${score}%` : ""}
                </p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    onTrack ? "bg-success" : "bg-accent",
                  )}
                  style={{ width: `${started ? Math.max(8, score) : 6}%` }}
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-board-edge bg-white/90 p-4">
              {onTrack ? (
                <div className="mb-4 rounded-xl bg-success-soft px-4 py-3">
                  <p className="text-[15px] font-semibold text-success">You are on track</p>
                  <p className="mt-1 text-sm leading-6 text-ink-soft">
                    You used the right idea on a new question. Press Play on the
                    picture anytime you want a reminder.
                  </p>
                </div>
              ) : null}

              <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
                {transfer ? "Check" : "Question"}
              </p>
              <p className="mt-2 font-[family-name:var(--font-newsreader)] text-xl leading-snug text-ink">
                {view?.question || "Starting…"}
              </p>
              {view?.message ? (
                <p className="mt-3 text-sm leading-6 text-ink-soft">{view.message}</p>
              ) : null}

              {(view?.confused || view?.rightModel) && !onTrack ? (
                <details className="mt-4 rounded-xl bg-paper px-3 py-2 text-sm text-ink-soft">
                  <summary className="cursor-pointer select-none text-[13px] font-medium text-ink">
                    What we noticed
                  </summary>
                  <div className="mt-2 space-y-2 pb-1 leading-6">
                    {view.confused ? (
                      <p>
                        Mix-up: {view.confused}
                      </p>
                    ) : null}
                    {view.rightModel ? <p>Instead: {view.rightModel}</p> : null}
                    {view.methodLabel ? <p>Picture: {view.methodLabel}</p> : null}
                  </div>
                </details>
              ) : null}

              {error ? (
                <p className="mt-3 text-sm text-error" role="alert">
                  {error}
                  {bootFailed ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => void boot()}
                      >
                        Try again
                      </button>
                    </>
                  ) : null}
                </p>
              ) : null}

              <form onSubmit={onSubmit} className="mt-auto pt-4">
                <label htmlFor="tutor-answer" className="sr-only">
                  Your answer
                </label>
                <Textarea
                  id="tutor-answer"
                  ref={boxRef}
                  value={draft}
                  disabled={busy || onTrack || !view?.sessionId}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void onSubmit();
                    }
                  }}
                  placeholder={
                    onTrack
                      ? "You can start a new conversation anytime."
                      : "Type your answer…"
                  }
                  className="min-h-[88px] resize-none bg-paper text-[15px]"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[12px] text-muted">
                    {user ? "Enter to send" : "A few free questions each day"}
                  </p>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={busy || onTrack || !draft.trim() || !view?.sessionId}
                  >
                    Send
                    <ArrowUp className="size-3.5" />
                  </Button>
                </div>
              </form>
            </div>
          </aside>
        </main>
      </div>
    </AppShell>
  );
}
