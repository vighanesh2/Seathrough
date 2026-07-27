"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMachine } from "@xstate/react";
import type { BoardNarrationLine } from "@/components/board/BoardNarration";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { ChatSidebar } from "@/components/ChatSidebar";
import { PaceControls } from "@/components/PaceControls";
import { PromptBar } from "@/components/PromptBar";
import { VisualStage } from "@/components/VisualStage";
import { consumeLessonStream } from "@/lib/client/consumeLessonStream";
import type { ConversationListItem } from "@/lib/conversations/types";
import { toUserFacingError } from "@/lib/errors/userFacing";
import { lessonMachine } from "@/lib/lesson/machine";
import { visualStableKey } from "@/lib/visuals/router";
import type { VisualPlan } from "@/lib/visuals/types";
import type { PaceSpeed, StreamEvent } from "@/types/lesson";

type LessonStatus = "idle" | "running" | "paused" | "done" | "error";

const SIDEBAR_KEY = "ve.chatSidebar.collapsed";

function chatsCacheKey(userId?: string | null): string {
  return userId ? `ve.chatSidebar.cache.${userId}` : "ve.chatSidebar.cache.anon";
}

function visualSummary(plan: VisualPlan | null): string {
  if (!plan) return "No figure on the board yet.";
  return [
    `renderer=${plan.renderer}`,
    plan.assetId ? `asset=${plan.assetId}` : null,
    plan.formula ? `formula=${plan.formula}` : null,
    plan.boardScript?.title ? `pen=${plan.boardScript.title}` : null,
    plan.sceneRecipe?.kind ? `sketch=${plan.sceneRecipe.kind}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function turnsToNarration(
  turns: Array<{ role: string; content: string }>,
): BoardNarrationLine[] {
  const lines: BoardNarrationLine[] = [];
  let i = 0;
  for (const turn of turns) {
    i += 1;
    if (turn.role === "student") {
      lines.push({ id: `t-${i}`, text: turn.content, kind: "student" });
    } else if (turn.role === "system") {
      lines.push({ id: `t-${i}`, text: turn.content, kind: "summary" });
    } else if (turn.role === "tutor") {
      lines.push({ id: `t-${i}`, text: turn.content, kind: "narration" });
    }
  }
  return lines;
}

function readCachedChats(userId?: string | null): ConversationListItem[] {
  try {
    const raw = localStorage.getItem(chatsCacheKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConversationListItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedChats(
  items: ConversationListItem[],
  userId?: string | null,
) {
  try {
    localStorage.setItem(
      chatsCacheKey(userId),
      JSON.stringify(items.slice(0, 50)),
    );
  } catch {
    // ignore
  }
}

export function LessonShell() {
  const { user, loading: authLoading, accessToken, logout } = useAuth();
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [prompt, setPrompt] = useState("explain what a class is in Java");
  const [status, setStatus] = useState<LessonStatus>("idle");
  const [speed, setSpeed] = useState<PaceSpeed>(1);
  const [title, setTitle] = useState<string | undefined>();
  const [visualPlan, setVisualPlan] = useState<VisualPlan | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [beatOrder, setBeatOrder] = useState(1);
  const [totalBeats, setTotalBeats] = useState<number | undefined>();
  const [boardNarration, setBoardNarration] = useState<BoardNarrationLine[]>(
    [],
  );
  const [codeBuffer, setCodeBuffer] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [lessonId, setLessonId] = useState<string | undefined>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [chatsLoading, setChatsLoading] = useState(true);
  const [, send] = useMachine(lessonMachine);
  const narrationSeqRef = useRef(0);
  const visualPlanRef = useRef<VisualPlan | null>(null);
  const conversationIdRef = useRef<string | undefined>(undefined);

  visualPlanRef.current = visualPlan;
  conversationIdRef.current = conversationId;

  const canFollowUp =
    Boolean(conversationId) &&
    (status === "done" || status === "paused" || status === "error");

  const onDrawComplete = useCallback(() => {
    send({ type: "DRAW_DONE" });
  }, [send]);

  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speedRef = useRef<PaceSpeed>(1);
  const pausedRef = useRef(false);
  const pauseGateRef = useRef<Promise<void>>(Promise.resolve());
  const resumePauseRef = useRef<(() => void) | null>(null);
  const lastVisualKeyRef = useRef<string>("");

  function pushNarration(
    text: string,
    kind: BoardNarrationLine["kind"] = "narration",
  ) {
    narrationSeqRef.current += 1;
    const id = `n-${narrationSeqRef.current}`;
    setBoardNarration((prev) => [...prev, { id, text, kind }]);
  }

  const refreshConversations = useCallback(async () => {
    if (!accessToken || !user?.id) {
      setConversations([]);
      setChatsLoading(false);
      return;
    }
    setChatsLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        setConversations([]);
        return;
      }
      const data = (await res.json()) as {
        conversations?: ConversationListItem[];
      };
      const list = data.conversations ?? [];
      setConversations(list);
      writeCachedChats(list, user.id);
    } catch {
      setConversations(readCachedChats(user.id));
    } finally {
      setChatsLoading(false);
    }
  }, [accessToken, user?.id]);

  function upsertLocalChat(item: ConversationListItem) {
    setConversations((prev) => {
      const next = [item, ...prev.filter((c) => c.id !== item.id)].slice(0, 50);
      writeCachedChats(next, user?.id);
      return next;
    });
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY);
      if (stored === "1") setSidebarCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      abortRef.current?.abort();
      setConversations([]);
      setChatsLoading(false);
      setAuthModal((prev) => prev ?? "login");
      return;
    }
    setAuthModal(null);
    setConversations(readCachedChats(user.id));
    void refreshConversations();
  }, [authLoading, refreshConversations, user?.id]);

  useEffect(() => {
    if (authLoading || user) return;
    resetLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear board when session ends
  }, [authLoading, user?.id]);

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
      case "student_message":
        pushNarration(event.text, "student");
        if (event.conversationId) {
          setConversationId(event.conversationId);
          conversationIdRef.current = event.conversationId;
        }
        break;
      case "plan_meta":
        setTitle(event.title);
        if (event.beatCount) setTotalBeats(event.beatCount);
        if (event.lessonId) setLessonId(event.lessonId);
        if (event.conversationId) {
          setConversationId(event.conversationId);
          conversationIdRef.current = event.conversationId;
          upsertLocalChat({
            id: event.conversationId,
            title: event.title || prompt.slice(0, 80) || "Lesson",
            rootPrompt: prompt,
            updatedAt: new Date().toISOString(),
            preview: prompt.slice(0, 100),
          });
        }
        send({ type: "PLAN_READY" });
        send({ type: "VALIDATED" });
        break;
      case "beat_start":
        setBeatOrder(event.beat.order);
        break;
      case "visual": {
        const stable = visualStableKey(event.plan);
        if (stable && stable === lastVisualKeyRef.current) {
          setVisualPlan((prev) => {
            if (!prev) return event.plan;
            const formula = prev.formula?.trim()
              ? prev.formula
              : event.plan.formula;
            if (formula === prev.formula) return prev;
            return { ...prev, formula };
          });
          break;
        }
        lastVisualKeyRef.current = stable;
        setVisualPlan(event.plan);
        setPlayKey((k) => k + 1);
        break;
      }
      case "board":
      case "diagram":
        break;
      case "code_delta":
        setCodeBuffer((prev) => prev + event.text);
        break;
      case "narration":
        if (event.text.startsWith("[voice unavailable")) {
          pushNarration(event.text, "error");
        } else {
          pushNarration(event.text, "narration");
        }
        break;
      case "audio":
        send({ type: "DRAW_DONE" });
        await playAudio(event.mimeType, event.base64);
        send({ type: "SPEAK_DONE" });
        send({ type: "NEXT_BEAT" });
        break;
      case "human_summary":
        pushNarration(event.text, "summary");
        break;
      case "error": {
        const friendly = toUserFacingError(event.message);
        send({ type: "ERROR", message: friendly });
        pushNarration(friendly, "error");
        setStatus("error");
        break;
      }
      case "done":
        send({ type: "COMPLETE" });
        if (event.conversationId) setConversationId(event.conversationId);
        if (event.lessonId) setLessonId(event.lessonId);
        setStatus("done");
        setPrompt("");
        void refreshConversations();
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
    lastVisualKeyRef.current = "";
    setBeatOrder(1);
    setTotalBeats(undefined);
    setBoardNarration([]);
    narrationSeqRef.current = 0;
    setCodeBuffer("");
    setConversationId(undefined);
    conversationIdRef.current = undefined;
    setLessonId(undefined);
  }

  function prepareSoftContinue() {
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    pausedRef.current = false;
    resumePauseRef.current?.();
    resumePauseRef.current = null;
  }

  async function runStream(mode: "new" | "follow_up", text: string) {
    const controller = new AbortController();
    abortRef.current = controller;
    let sawTerminal = false;

    try {
      await consumeLessonStream({
        prompt: text,
        withAudio: true,
        signal: controller.signal,
        mode,
        conversationId:
          mode === "follow_up" ? conversationIdRef.current : undefined,
        visualSummary:
          mode === "follow_up"
            ? visualSummary(visualPlanRef.current)
            : undefined,
        accessToken,
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
      const message = toUserFacingError(
        error instanceof Error ? error.message : "Failed to stream lesson",
      );
      send({ type: "ERROR", message });
      pushNarration(message, "error");
      setStatus("error");
    }
  }

  async function startLesson() {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    if (!user || !accessToken) {
      setAuthModal("login");
      return;
    }

    resetLesson();
    send({ type: "START", title: trimmed });
    setStatus("running");
    await runStream("new", trimmed);
  }

  async function askFollowUp() {
    const trimmed = prompt.trim();
    if (!trimmed || !conversationIdRef.current) return;
    if (!user || !accessToken) {
      setAuthModal("login");
      return;
    }

    prepareSoftContinue();
    send({ type: "START", title: trimmed });
    setStatus("running");
    await runStream("follow_up", trimmed);
  }

  function onPromptSubmit() {
    if (canFollowUp) {
      void askFollowUp();
      return;
    }
    void startLesson();
  }

  async function openConversation(id: string) {
    if (status === "running") return;
    if (!accessToken) {
      setAuthModal("login");
      return;
    }
    prepareSoftContinue();
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        conversation: {
          conversationId: string;
          rootPrompt: string;
          title?: string | null;
          lessonId?: string;
          turns: Array<{ role: string; content: string }>;
        };
        visualPlan?: VisualPlan | null;
      };
      const ctx = data.conversation;
      setConversationId(ctx.conversationId);
      conversationIdRef.current = ctx.conversationId;
      setLessonId(ctx.lessonId);
      setTitle(ctx.title || ctx.rootPrompt || "Lesson");
      const lines = turnsToNarration(ctx.turns);
      setBoardNarration(lines);
      narrationSeqRef.current = lines.length;
      setCodeBuffer("");
      setPrompt("");
      setStatus("done");
      if (data.visualPlan) {
        lastVisualKeyRef.current = visualStableKey(data.visualPlan);
        setVisualPlan(data.visualPlan);
        setPlayKey((k) => k + 1);
      } else {
        setVisualPlan(null);
        lastVisualKeyRef.current = "";
      }
      send({ type: "RESET" });
    } catch {
      // keep current view
    }
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

  function togglePlay() {
    if (status === "idle" || status === "error") {
      void startLesson();
      return;
    }
    if (status === "done") {
      if (prompt.trim()) void startLesson();
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

  if (authLoading) {
    return (
      <div className="flex h-dvh max-h-dvh w-full items-center justify-center bg-[radial-gradient(ellipse_at_top,_#f7f3ea_0%,_#e8eef5_55%,_#d9e4ef_100%)]">
        <p className="font-sans text-sm text-muted">Checking your session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex h-dvh max-h-dvh w-full items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,#f7f3ea_0%,#e8eef5_55%,#d9e4ef_100%)]">
        <AuthModal
          key={authModal ?? "required"}
          open
          required
          initialMode={authModal ?? "login"}
          onClose={() => setAuthModal(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh w-full overflow-hidden">
      <ChatSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        conversations={conversations}
        activeId={conversationId}
        loading={chatsLoading}
        onSelect={(id) => {
          void openConversation(id);
        }}
        onNewChat={() => {
          resetLesson();
          setPrompt("");
        }}
        username={user.username}
        authLoading={authLoading}
        onLogin={() => setAuthModal("login")}
        onSignup={() => setAuthModal("signup")}
        onLogout={() => {
          void logout();
          resetLesson();
          setConversations([]);
        }}
      />

      <AuthModal
        key={authModal ?? "closed"}
        open={authModal != null}
        initialMode={authModal ?? "login"}
        onClose={() => setAuthModal(null)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-40 flex shrink-0 flex-col gap-3 border-b border-board-edge/80 bg-chalk/90 px-4 py-3 backdrop-blur-md md:flex-row md:items-center md:gap-4 md:px-5">
          <div className="min-w-0 shrink-0 md:w-[180px]">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              Learn by seeing
            </p>
            <h1 className="truncate font-display text-xl font-semibold text-ink md:text-2xl">
              SeeThrough
            </h1>
          </div>

          <div className="min-w-0 flex-1">
            <PromptBar
              value={prompt}
              onChange={setPrompt}
              onSubmit={onPromptSubmit}
              disabled={busy}
              placeholder={
                canFollowUp
                  ? "Ask a follow-up about this lesson…"
                  : "What should we learn today?"
              }
              submitLabel={canFollowUp ? "Ask" : "Start"}
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <PaceControls
              playing={status === "running"}
              speed={speed}
              onTogglePlay={togglePlay}
              onSpeedChange={setSpeed}
              onSkip={skipBeat}
              disabled={status === "idle" && !prompt.trim()}
            />
          </div>
        </header>

        <div className="relative min-h-0 flex-1">
          <VisualStage
            plan={visualPlan}
            playKey={playKey}
            title={title}
            beatOrder={beatOrder}
            totalBeats={totalBeats}
            narrationLines={boardNarration}
            codeBuffer={codeBuffer}
            streaming={status === "running"}
            onDrawComplete={onDrawComplete}
          />
        </div>
      </div>
    </div>
  );
}
