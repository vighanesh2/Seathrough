"use client";

import { useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { AppHeader } from "@/components/lms/AppHeader";
import { AppShell } from "@/components/lms/AppShell";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { PromptBar } from "@/components/PromptBar";
import { SceneAgentRail } from "@/components/scene-explain/SceneAgentRail";
import { SceneViewport } from "@/components/scene-explain/SceneViewport";
import { useSceneSession } from "@/components/scene-explain/useSceneSession";

export function SceneExplainShell() {
  const { user, accessToken, loading: authLoading, logout } = useAuth();
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [prompt, setPrompt] = useState("");
  const session = useSceneSession(accessToken);

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem("seethrough.pendingPrompt");
      if (pending) {
        sessionStorage.removeItem("seethrough.pendingPrompt");
        setPrompt(pending);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function onSubmit() {
    const trimmed = prompt.trim();
    if (!trimmed || session.busy) return;
    if (!user || !accessToken) {
      setAuthModal("login");
      return;
    }
    void session.run(trimmed);
  }

  const streaming =
    session.status === "building" ||
    session.status === "fixing" ||
    session.status === "explaining";

  return (
    <AppShell>
      <AuthModal
        key={authModal ?? "closed"}
        open={authModal != null}
        initialMode={authModal ?? "login"}
        onClose={() => setAuthModal(null)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          current="scene-explain"
          eyebrow="3D scenes"
          title={session.title ?? "Ask for any process"}
          account={
            <AccountMenu
              onLogin={() => setAuthModal("login")}
              onSignup={() => setAuthModal("signup")}
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
            disabled={session.busy || authLoading}
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
              <div className="pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-black/50 to-transparent px-4 py-3">
                <p className="font-sans text-xs text-white/80">
                  {session.status === "fixing"
                    ? "Scene crashed — the agent is rewriting it…"
                    : "Agent is writing a Three.js scene…"}
                </p>
              </div>
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
