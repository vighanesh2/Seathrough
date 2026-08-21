"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/lms/AppHeader";
import { AppShell } from "@/components/lms/AppShell";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { PromptBar } from "@/components/PromptBar";
import { SceneAgentRail } from "@/components/scene-explain/SceneAgentRail";
import { SceneViewport } from "@/components/scene-explain/SceneViewport";
import { useSceneSession } from "@/components/scene-explain/useSceneSession";
import { useQuestionAccess } from "@/components/usage/QuestionAccess";
import { ThinkingLoader } from "@/components/ui/ThinkingLoader";
import { clearPendingPrompt, takePendingPrompt } from "@/lib/usage/pendingPrompt";

export function SceneExplainShell() {
  const { accessToken, logout } = useAuth();
  const { beginQuestion, cancelQuestion, openAuth } = useQuestionAccess();
  const [prompt, setPrompt] = useState("");
  const session = useSceneSession(accessToken);
  const pendingHandledRef = useRef(false);

  function onSubmitWithText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || session.busy) return;
    if (!beginQuestion()) return;
    void session.run(trimmed).then((ok) => {
      if (ok === false) cancelQuestion();
    });
  }

  function onSubmit() {
    onSubmitWithText(prompt);
  }

  useEffect(() => {
    const pending = takePendingPrompt();
    if (!pending) return;
    setPrompt(pending.prompt);
    if (!pending.autoStart) {
      clearPendingPrompt();
      return;
    }

    // Defer past React Strict Mode's mount→cleanup→remount so the first
    // aborted run doesn't eat the handoff and leave the scene stuck.
    const timer = window.setTimeout(() => {
      if (pendingHandledRef.current) return;
      pendingHandledRef.current = true;
      clearPendingPrompt();
      onSubmitWithText(pending.prompt);
    }, 60);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot marketing handoff
  }, []);

  const streaming =
    session.status === "building" ||
    session.status === "fixing" ||
    session.status === "explaining";

  return (
    <AppShell>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          current="scene-explain"
          eyebrow="3D scenes"
          title={session.title ?? "Ask for any process"}
          account={
            <AccountMenu
              onLogin={() => openAuth("login")}
              onSignup={() => openAuth("signup")}
              onLogout={() => {
                void logout();
                session.reset();
                setPrompt("");
              }}
            />
          }
        >
          <PromptBar
            value={prompt}
            onChange={setPrompt}
            onSubmit={onSubmit}
            disabled={session.busy}
            placeholder="Try “osmosis” or “how a comet orbits the sun”…"
            submitLabel={session.program ? "Rebuild" : "Build scene"}
            inputId="scene-prompt"
            inputLabel="3D scene prompt"
          />
        </AppHeader>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="relative min-h-0 min-w-0 flex-1 bg-ink">
            <SceneViewport
              code={session.code}
              frameKey={session.frameKey}
              reveal={session.reveal}
              onReady={session.onFrameReady}
              onError={session.onFrameError}
            />
            {session.status === "building" || session.status === "fixing" ? (
              <ThinkingLoader
                variant="overlay"
                label={
                  session.status === "fixing"
                    ? "Repairing the scene"
                    : "Building the 3D scene"
                }
                className="bg-[radial-gradient(ellipse_at_50%_40%,rgba(26,43,60,0.55),rgba(26,43,60,0.72))] [&_p]:text-white [&_.thinking-shimmer]:bg-white/15 [&_.thinking-shimmer-beam]:via-white/70"
              />
            ) : null}
          </div>
          <div className="h-[38dvh] shrink-0 md:h-auto md:w-[min(100%,380px)]">
            <SceneAgentRail
              title={session.title}
              streaming={streaming}
              logs={session.logs}
              narration={session.narration}
              emptyHint="The agent will build any 3D process here, then explain it as it plays. If the scene crashes, it rewrites the code and tries again."
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
