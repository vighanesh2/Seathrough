"use client";

import { PanelLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ChatSidebar } from "@/components/ChatSidebar";
import { AppHeader } from "@/components/lms/AppHeader";
import { AppShell } from "@/components/lms/AppShell";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { PromptBar } from "@/components/PromptBar";
import { SceneAgentRail } from "@/components/scene-explain/SceneAgentRail";
import { SceneViewport } from "@/components/scene-explain/SceneViewport";
import { useSceneSession } from "@/components/scene-explain/useSceneSession";
import { useQuestionAccess } from "@/components/usage/QuestionAccess";
import { Button } from "@/components/ui/button";
import { ThinkingLoader } from "@/components/ui/ThinkingLoader";
import type { ConversationListItem } from "@/lib/conversations/types";
import {
  getSceneExplainSession,
  migrateAnonSceneExplainSessions,
  newSceneExplainSessionId,
  readSceneExplainSessions,
  sceneExplainSessionsToListItems,
  upsertSceneExplainSession,
  type SceneExplainSession,
} from "@/lib/scene-explain/sessionHistory";
import { clearPendingPrompt, takePendingPrompt } from "@/lib/usage/pendingPrompt";

const SIDEBAR_KEY = "ve.sceneExplainSidebar.collapsed";

export function SceneExplainShell() {
  const { accessToken, user, loading: authLoading, logout } = useAuth();
  const { beginQuestion, cancelQuestion, openAuth } = useQuestionAccess();
  const [prompt, setPrompt] = useState("");
  const session = useSceneSession(accessToken);
  const [sessionId, setSessionId] = useState(() => newSceneExplainSessionId());
  const [sessions, setSessions] = useState<SceneExplainSession[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pendingHandledRef = useRef(false);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const listItems: ConversationListItem[] = useMemo(
    () => sceneExplainSessionsToListItems(sessions),
    [sessions],
  );

  const refreshSessions = useCallback(() => {
    if (user?.id) {
      setSessions(migrateAnonSceneExplainSessions(user.id));
      return;
    }
    setSessions(readSceneExplainSessions(null));
  }, [user?.id]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY);
      if (stored === "1") {
        queueMicrotask(() => setSidebarCollapsed(true));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => refreshSessions());
  }, [refreshSessions]);

  function persistSnapshot(
    snapshot: {
      prompt: string;
      title: string;
      program: SceneExplainSession["program"];
      code: string;
      reveal: number;
      logs: SceneExplainSession["logs"];
      narration: string[];
    },
  ) {
    const now = new Date().toISOString();
    const existing = getSceneExplainSession(sessionIdRef.current, user?.id);
    const saved: SceneExplainSession = {
      id: sessionIdRef.current,
      title: snapshot.title || snapshot.prompt.slice(0, 72),
      prompt: snapshot.prompt,
      program: snapshot.program,
      code: snapshot.code,
      reveal: snapshot.reveal,
      logs: snapshot.logs,
      narration: snapshot.narration,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    setSessions(upsertSceneExplainSession(saved, user?.id));
  }

  function startNewScene() {
    if (session.busy) return;
    session.reset();
    setSessionId(newSceneExplainSessionId());
    setPrompt("");
  }

  function openSession(id: string) {
    if (session.busy) return;
    const saved = getSceneExplainSession(id, user?.id);
    if (!saved) {
      refreshSessions();
      return;
    }
    setSessionId(saved.id);
    setPrompt(saved.prompt);
    session.restore({
      title: saved.title,
      program: saved.program,
      code: saved.code,
      reveal: saved.reveal,
      logs: saved.logs,
      narration: saved.narration,
    });
  }

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  function onSubmitWithText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || session.busy) return;
    if (!beginQuestion()) return;
    void session.run(trimmed).then((result) => {
      if (result === false) {
        cancelQuestion();
        return;
      }
      persistSnapshot(result);
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
      <ChatSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        conversations={listItems}
        activeId={sessionId}
        onSelect={openSession}
        onNewChat={startNewScene}
        username={user?.username}
        authLoading={authLoading}
        onLogin={() => openAuth("login")}
        onSignup={() => openAuth("signup")}
        onLogout={() => {
          void logout();
          session.reset();
          setSessionId(newSceneExplainSessionId());
          setPrompt("");
          refreshSessions();
        }}
        historyTitle="Your scenes"
        historyEyebrow="3D process"
        newChatLabel="New scene"
        emptyHint="Build a process — past scenes will show up here."
        ariaLabel="3D scene history"
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          current="scene-explain"
          eyebrow="3D scenes"
          title={session.title ?? "Ask for any process"}
          leading={
            sidebarCollapsed ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={toggleSidebar}
                aria-label="Show history"
                aria-expanded={false}
              >
                <PanelLeft className="size-4" />
              </Button>
            ) : null
          }
          account={
            <AccountMenu
              onLogin={() => openAuth("login")}
              onSignup={() => openAuth("signup")}
              onLogout={() => {
                void logout();
                session.reset();
                setSessionId(newSceneExplainSessionId());
                setPrompt("");
                refreshSessions();
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

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
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
                    : "Designing a detailed 3D scene"
                }
                className="bg-[radial-gradient(ellipse_at_50%_40%,rgba(26,43,60,0.55),rgba(26,43,60,0.72))] [&_p]:text-white [&_.thinking-shimmer]:bg-white/15 [&_.thinking-shimmer-beam]:via-white/70"
              />
            ) : null}
          </div>
          <div className="hidden h-full w-[min(26rem,38vw)] shrink-0 sm:block">
            <SceneAgentRail
              title={session.title}
              streaming={streaming}
              logs={session.logs}
              narration={session.narration}
              emptyHint="As the scene builds, the spoken steps will land here so you can reread them."
              placement="side"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 z-30 sm:hidden">
            <SceneAgentRail
              title={session.title}
              streaming={streaming}
              logs={session.logs}
              narration={session.narration}
              emptyHint="As the scene builds, the spoken steps will land here so you can reread them."
              placement="bottom"
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
