"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelLeft } from "lucide-react";
import { useMachine } from "@xstate/react";
import type { BoardNarrationLine } from "@/components/board/BoardNarration";
import { useAuth } from "@/components/AuthProvider";
import { ChatSidebar } from "@/components/ChatSidebar";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { AppHeader } from "@/components/lms/AppHeader";
import { AppShell } from "@/components/lms/AppShell";
import { AskMeMcqDialog } from "@/components/AskMeMcqDialog";
import { PaceControls } from "@/components/PaceControls";
import {
  latestPipelineEvent,
  PipelineActivity,
  pipelineStatusLabel,
  type PipelineRecords,
} from "@/components/PipelineActivity";
import { PromptBar } from "@/components/PromptBar";
import { SceneAgentRail } from "@/components/scene-explain/SceneAgentRail";
import { SceneViewport } from "@/components/scene-explain/SceneViewport";
import { useSceneSession } from "@/components/scene-explain/useSceneSession";
import { useQuestionAccess } from "@/components/usage/QuestionAccess";
import { ThinkingLoader } from "@/components/ui/ThinkingLoader";
import { VisualStage } from "@/components/VisualStage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PenCueTracker } from "@/lib/board/penCues";
import { consumeLessonStream } from "@/lib/client/consumeLessonStream";
import type { ConversationListItem } from "@/lib/conversations/types";
import type { AnatomyStructureId } from "@/lib/anatomy/types";
import { DrawCommandQueue } from "@/lib/draw-engine/resolve";
import type { DrawCommand } from "@/lib/draw-engine/commands";
import { toUserFacingError } from "@/lib/errors/userFacing";
import { lessonMachine } from "@/lib/lesson/machine";
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
import { visualStableKey } from "@/lib/visuals/router";
import type { VisualPlan } from "@/lib/visuals/types";
import type { LessonSource, PaceSpeed, StreamEvent } from "@/types/lesson";
import {
  threeSceneFromChoiceOrNull,
  type ThreeScenePlan,
} from "@/lib/three-scenes/decide";

type LessonStatus = "idle" | "running" | "paused" | "done" | "error";

const SIDEBAR_KEY = "ve.chatSidebar.collapsed";

function chatsCacheKey(userId?: string | null): string {
  return userId ? `ve.chatSidebar.cache.${userId}` : "ve.chatSidebar.cache.anon";
}

function visualSummary(
  plan: VisualPlan | null,
  threeScene: ThreeScenePlan | null,
  selectedStructure: AnatomyStructureId | null,
): string {
  if (threeScene) {
    return [
      `renderer=three`,
      `scene=${threeScene.id}`,
      `title=${threeScene.title}`,
      `reveal=${threeScene.reveal}/${threeScene.maxReveal}`,
      selectedStructure ? `selected=${selectedStructure}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
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
  const lastStudentIndex = turns.findLastIndex(
    (turn) => turn.role === "student",
  );
  const currentLessonTurns =
    lastStudentIndex >= 0 ? turns.slice(lastStudentIndex) : turns;
  let i = 0;
  for (const turn of currentLessonTurns) {
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

function rebaseDrawCommands(
  commands: DrawCommand[],
  queue: DrawCommandQueue,
  clockMs: number,
): DrawCommand[] {
  if (!commands.length) return commands;
  const existing = queue.getAll();
  const prevEnd = existing.reduce(
    (m, c) => Math.max(m, c.t0 + (c.durationMs || 0)),
    0,
  );
  const minT = Math.min(...commands.map((c) => c.t0));
  const base = Math.max(clockMs + 80, prevEnd + 120);
  return commands.map((c) => ({
    ...c,
    t0: base + (c.t0 - minT),
  }));
}

function rebaseDrawCommand(
  command: DrawCommand,
  queue: DrawCommandQueue,
  clockMs: number,
): DrawCommand {
  return rebaseDrawCommands([command], queue, clockMs)[0]!;
}

function commandBottomY(cmd: DrawCommand): number {
  switch (cmd.type) {
    case "text":
      return cmd.y + (cmd.fontSize ?? 18) * 1.6;
    case "rect":
    case "highlight":
    case "image":
      return cmd.y + cmd.h;
    case "circle":
      return cmd.y + cmd.radius;
    case "line":
    case "arrow":
      return Math.max(cmd.y1, cmd.y2);
    case "stroke":
      return Math.max(...cmd.points.map((p) => p.y), 0);
    default:
      return 0;
  }
}

function commandsBottomY(commands: DrawCommand[]): number {
  let max = 0;
  for (const c of commands) {
    max = Math.max(max, commandBottomY(c));
  }
  return max;
}

export function LessonShell() {
  const { user, loading: authLoading, accessToken, logout } = useAuth();
  const { beginQuestion, cancelQuestion, openAuth } = useQuestionAccess();
  const scene = useSceneSession(accessToken);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<LessonStatus>("idle");
  const pendingHandledRef = useRef(false);
  const [speed, setSpeed] = useState<PaceSpeed>(1);
  const [title, setTitle] = useState<string | undefined>();
  const [visualPlan, setVisualPlan] = useState<VisualPlan | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [beatOrder, setBeatOrder] = useState(1);
  const [totalBeats, setTotalBeats] = useState<number | undefined>();
  const [boardNarration, setBoardNarration] = useState<BoardNarrationLine[]>(
    [],
  );
  const [lessonSources, setLessonSources] = useState<LessonSource[]>([]);
  const [pipelineRecords, setPipelineRecords] = useState<PipelineRecords>({});
  const [pipelineExpanded, setPipelineExpanded] = useState(true);
  const [codeBuffer, setCodeBuffer] = useState("");
  const [followUpPrompt, setFollowUpPrompt] = useState("");
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
  const drawQueue = useMemo(() => new DrawCommandQueue(), []);
  const [drawSessionKey, setDrawSessionKey] = useState(0);
  const [drawPlaying, setDrawPlaying] = useState(false);
  const [preferDrawEngine, setPreferDrawEngine] = useState(false);
  const [drawSpeech, setDrawSpeech] = useState<string | null>(null);
  const [boardCanvasHeight, setBoardCanvasHeight] = useState(600);
  const [boardScrollToY, setBoardScrollToY] = useState<number | null>(null);
  const [threeScene, setThreeScene] = useState<ThreeScenePlan | null>(null);
  const [threeSelected, setThreeSelected] =
    useState<AnatomyStructureId | null>(null);
  const drawClockRef = useRef(0);
  const boardBottomYRef = useRef(0);
  const threeSceneRef = useRef<ThreeScenePlan | null>(null);
  const threeSelectedRef = useRef<AnatomyStructureId | null>(null);

  visualPlanRef.current = visualPlan;
  conversationIdRef.current = conversationId;
  threeSceneRef.current = threeScene;
  threeSelectedRef.current = threeSelected;

  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [showAskMe, setShowAskMe] = useState(false);
  const [sceneMode, setSceneMode] = useState(false);
  const [sceneSessionId, setSceneSessionId] = useState(() =>
    newSceneExplainSessionId(),
  );
  const [sceneSessions, setSceneSessions] = useState<SceneExplainSession[]>([]);
  const sceneSessionIdRef = useRef(sceneSessionId);
  sceneSessionIdRef.current = sceneSessionId;

  const canAskMe =
    !sceneMode &&
    status !== "idle" &&
    Boolean(conversationId || title || boardNarration.length > 0);
  const showFollowUp =
    !sceneMode && Boolean(conversationId && lessonId) && status !== "idle";

  const askMeNarration = useMemo(
    () =>
      boardNarration
        .filter((line) => line.kind !== "error")
        .map((line) => line.text.trim())
        .filter(Boolean)
        .slice(-20),
    [boardNarration],
  );

  const sceneListItems: ConversationListItem[] = useMemo(
    () => sceneExplainSessionsToListItems(sceneSessions),
    [sceneSessions],
  );

  const sceneStreaming =
    scene.status === "building" ||
    scene.status === "fixing" ||
    scene.status === "explaining";

  const onDrawComplete = useCallback(() => {
    send({ type: "DRAW_DONE" });
  }, [send]);

  const abortRef = useRef<AbortController | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);
  const lessonGenerationRef = useRef(0);
  const lessonSubmitLockedRef = useRef(false);
  const followUpSubmitLockedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speedRef = useRef<PaceSpeed>(1);
  const pausedRef = useRef(false);
  const penCues = useMemo(
    () =>
      new PenCueTracker({
        clock: () => drawClockRef.current,
        isPaused: () => pausedRef.current,
      }),
    [],
  );
  const pauseGateRef = useRef<Promise<void>>(Promise.resolve());
  const resumePauseRef = useRef<(() => void) | null>(null);
  const lastVisualKeyRef = useRef<string>("");
  const statusRef = useRef<LessonStatus>(status);
  statusRef.current = status;
  /** True when we auto-paused because the tab/window was hidden. */
  const pausedByVisibilityRef = useRef(false);

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
      if (stored === "1") {
        queueMicrotask(() => setSidebarCollapsed(true));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!user?.id) {
        setConversations([]);
        setChatsLoading(false);
        return;
      }
      setConversations(readCachedChats(user.id));
      void refreshConversations();
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, refreshConversations, user?.id]);

  useEffect(() => {
    if (pendingHandledRef.current) return;

    let startAsScene = false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("view") === "3d") {
        startAsScene = true;
        setSceneMode(true);
        window.history.replaceState({}, "", "/lessons");
      }
    } catch {
      // ignore
    }

    const pending = takePendingPrompt();
    if (!pending) {
      if (startAsScene) pendingHandledRef.current = true;
      return;
    }
    pendingHandledRef.current = true;
    setPrompt(pending.prompt);
    if (pending.autoStart) {
      if (startAsScene) {
        void startSceneWithText(pending.prompt).finally(() => {
          clearPendingPrompt();
        });
      } else {
        void startLessonWithText(pending.prompt).finally(() => {
          clearPendingPrompt();
        });
      }
    } else {
      clearPendingPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot marketing handoff
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      if (user?.id) {
        setSceneSessions(migrateAnonSceneExplainSessions(user.id));
        return;
      }
      setSceneSessions(readSceneExplainSessions(null));
    });
  }, [user?.id]);

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
      penCues.stopWaiting();
    };
  }, [penCues]);

  function pauseLesson(opts?: { fromVisibility?: boolean }) {
    if (statusRef.current !== "running") return;
    pausedRef.current = true;
    audioRef.current?.pause();
    send({ type: "INTERRUPT" });
    setStatus("paused");
    setDrawPlaying(false);
    pausedByVisibilityRef.current = Boolean(opts?.fromVisibility);
    if (!opts?.fromVisibility) {
      setShowResumePrompt(false);
    }
  }

  function openAskMe() {
    if (statusRef.current === "running") {
      pauseLesson({ fromVisibility: false });
    }
    setShowAskMe(true);
  }

  function resumeLesson() {
    if (statusRef.current !== "paused" && !pausedRef.current) return;
    pausedByVisibilityRef.current = false;
    setShowResumePrompt(false);
    pausedRef.current = false;
    send({ type: "RESUME" });
    setStatus("running");
    resumePauseRef.current?.();
    resumePauseRef.current = null;
    void audioRef.current?.play().catch(() => undefined);
  }

  function dismissResumePrompt() {
    pausedByVisibilityRef.current = false;
    setShowResumePrompt(false);
  }

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        if (statusRef.current === "running") {
          pauseLesson({ fromVisibility: true });
        }
        return;
      }
      if (document.visibilityState !== "visible") return;
      if (
        pausedByVisibilityRef.current &&
        (statusRef.current === "paused" || pausedRef.current)
      ) {
        setShowResumePrompt(true);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // pauseLesson closes over send/setState — stable enough for this listener
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send]);

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

  async function handleEvent(event: StreamEvent, generation: number) {
    await waitIfPaused();
    if (generation !== lessonGenerationRef.current) return;

    switch (event.type) {
      case "pipeline_status":
        setPipelineRecords((previous) => ({
          ...previous,
          [event.stage]: event,
        }));
        if (event.state === "started") setPipelineExpanded(true);
        break;
      case "student_message":
        pushNarration(event.text, "student");
        if (event.conversationId) {
          setConversationId(event.conversationId);
          conversationIdRef.current = event.conversationId;
        }
        break;
      case "sources":
        setLessonSources(event.sources);
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
            if (
              event.plan.renderer === "jsxgraph" &&
              event.plan.topicParams &&
              JSON.stringify(prev.topicParams) !==
                JSON.stringify(event.plan.topicParams)
            ) {
              return event.plan;
            }
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
      case "diagram_plan":
        // Server holds the full UML JSON; board updates arrive via draw_cmds.
        break;
      case "three_scene":
        if (threeSceneRef.current?.id !== event.plan.id) {
          setThreeSelected(null);
        }
        setThreeScene(event.plan);
        // Drop placeholder rough/template visuals once 3D takes over.
        setVisualPlan(null);
        lastVisualKeyRef.current = "";
        break;
      case "draw_session":
        if (event.reset !== false) {
          drawQueue.clear();
          setDrawSessionKey((k) => k + 1);
          drawClockRef.current = 0;
          boardBottomYRef.current = 0;
          penCues.reset();
        }
        if (event.canvas?.height) {
          setBoardCanvasHeight((h) => Math.max(h, event.canvas.height));
        }
        if (typeof event.scrollToY === "number") {
          setBoardScrollToY(event.scrollToY);
        }
        setPreferDrawEngine(true);
        setDrawPlaying(true);
        setDrawSpeech(null);
        break;
      case "draw_cmd":
        setPreferDrawEngine(true);
        if (!pausedRef.current) setDrawPlaying(true);
        drawQueue.enqueue(
          rebaseDrawCommand(event.command, drawQueue, drawClockRef.current),
        );
        boardBottomYRef.current = Math.max(
          boardBottomYRef.current,
          commandBottomY(event.command),
        );
        setBoardCanvasHeight((h) =>
          Math.max(h, boardBottomYRef.current + 80),
        );
        break;
      case "draw_cmds": {
        setPreferDrawEngine(true);
        if (!pausedRef.current) setDrawPlaying(true);
        const rebased = rebaseDrawCommands(
          event.commands,
          drawQueue,
          drawClockRef.current,
        );
        if (event.beatId) {
          penCues.registerBeat(event.beatId, event.commands, rebased);
        }
        drawQueue.enqueue(rebased);
        boardBottomYRef.current = Math.max(
          boardBottomYRef.current,
          commandsBottomY(event.commands),
        );
        setBoardCanvasHeight((h) =>
          Math.max(h, boardBottomYRef.current + 80),
        );
        break;
      }
      case "draw_speak":
        setDrawSpeech(event.text);
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
      case "audio": {
        const cue = penCues.cueFor(event.beatId, event.cueT0);
        if (cue != null) await penCues.waitForPen(cue);
        if (event.text) setDrawSpeech(event.text);
        await playAudio(event.mimeType, event.base64);
        send({ type: "SPEAK_DONE" });
        send({ type: "NEXT_BEAT" });
        break;
      }
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
        setPipelineExpanded(false);
        setPrompt("");
        void refreshConversations();
        break;
      default:
        break;
    }
  }

  function resetLesson() {
    lessonSubmitLockedRef.current = false;
    followUpSubmitLockedRef.current = false;
    lessonGenerationRef.current += 1;
    historyAbortRef.current?.abort();
    historyAbortRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    penCues.reset();
    pausedRef.current = false;
    pausedByVisibilityRef.current = false;
    setShowResumePrompt(false);
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
    setLessonSources([]);
    setPipelineRecords({});
    setPipelineExpanded(true);
    narrationSeqRef.current = 0;
    setCodeBuffer("");
    setFollowUpPrompt("");
    setConversationId(undefined);
    conversationIdRef.current = undefined;
    setLessonId(undefined);
    drawQueue.clear();
    drawClockRef.current = 0;
    setDrawSessionKey((k) => k + 1);
    setBoardCanvasHeight(600);
    setBoardScrollToY(null);
    setThreeScene(null);
    setThreeSelected(null);
    boardBottomYRef.current = 0;
    setDrawPlaying(false);
    setPreferDrawEngine(false);
    setDrawSpeech(null);
  }

  function prepareSoftContinue() {
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    penCues.stopWaiting();
    pausedRef.current = false;
    resumePauseRef.current?.();
    resumePauseRef.current = null;
    setBoardNarration([]);
    setLessonSources([]);
    narrationSeqRef.current = 0;
    setCodeBuffer("");
    setPipelineRecords({});
    setPipelineExpanded(true);
  }

  function prepareFollowUp() {
    abortRef.current?.abort();
    abortRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    penCues.stopWaiting();
    pausedRef.current = false;
    resumePauseRef.current?.();
    resumePauseRef.current = null;
    setCodeBuffer("");
    setDrawSpeech(null);
    setPipelineRecords({});
    setPipelineExpanded(true);
  }

  async function runStream(
    mode: "new" | "follow_up",
    text: string,
    options?: { onAbort?: () => void },
  ) {
    const generation = lessonGenerationRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    let sawTerminal = false;
    let sawProgress = false;

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
            ? visualSummary(
                visualPlanRef.current,
                threeSceneRef.current,
                threeSelectedRef.current,
              )
            : undefined,
        boardBottomY:
          mode === "follow_up" ? boardBottomYRef.current : undefined,
        accessToken,
        onEvent: async (event) => {
          if (
            generation !== lessonGenerationRef.current ||
            abortRef.current !== controller
          ) {
            return;
          }
          if (event.type !== "error") {
            sawProgress = true;
          }
          if (event.type === "error" || event.type === "done") {
            sawTerminal = true;
          }
          await handleEvent(event, generation);
        },
      });
      if (controller.signal.aborted) {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setStatus("idle");
        }
        if (!sawProgress) options?.onAbort?.();
        return;
      }
      if (!sawTerminal) {
        setStatus("done");
      }
    } catch (error) {
      if (controller.signal.aborted) {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setStatus("idle");
        }
        if (!sawProgress) options?.onAbort?.();
        return;
      }
      const message = toUserFacingError(
        error instanceof Error ? error.message : "Failed to stream lesson",
      );
      send({ type: "ERROR", message });
      pushNarration(message, "error");
      setStatus("error");
      if (!sawProgress) options?.onAbort?.();
    }
  }

  async function startLessonWithText(trimmed: string) {
    if (
      !trimmed ||
      statusRef.current !== "idle" ||
      lessonSubmitLockedRef.current
    ) {
      return;
    }
    if (!beginQuestion()) return;

    resetLesson();
    lessonSubmitLockedRef.current = true;
    send({ type: "START", title: trimmed });
    setStatus("running");
    await runStream("new", trimmed, { onAbort: cancelQuestion });
  }

  async function startLesson() {
    await startLessonWithText(prompt.trim());
  }

  async function askFollowUp() {
    const text = followUpPrompt.trim();
    if (
      !text ||
      !conversationIdRef.current ||
      !lessonId ||
      followUpSubmitLockedRef.current ||
      statusRef.current === "running" ||
      statusRef.current === "paused"
    ) {
      return;
    }
    if (!beginQuestion()) return;

    followUpSubmitLockedRef.current = true;
    lessonGenerationRef.current += 1;
    prepareFollowUp();
    setFollowUpPrompt("");
    send({ type: "RESET" });
    send({ type: "START", title: title ?? text });
    setStatus("running");
    try {
      await runStream("follow_up", text, { onAbort: cancelQuestion });
    } finally {
      followUpSubmitLockedRef.current = false;
    }
  }

  function persistSceneSnapshot(snapshot: {
    prompt: string;
    title: string;
    program: SceneExplainSession["program"];
    code: string;
    reveal: number;
    logs: SceneExplainSession["logs"];
    narration: string[];
  }) {
    const now = new Date().toISOString();
    const existing = getSceneExplainSession(sceneSessionIdRef.current, user?.id);
    const saved: SceneExplainSession = {
      id: sceneSessionIdRef.current,
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
    setSceneSessions(upsertSceneExplainSession(saved, user?.id));
  }

  async function startSceneWithText(trimmed: string) {
    if (!trimmed || scene.busy) return;
    if (!beginQuestion()) return;

    if (statusRef.current === "running") {
      abortRef.current?.abort();
      pauseLesson({ fromVisibility: false });
    }

    setSceneMode(true);
    const result = await scene.run(trimmed);
    if (result === false) {
      cancelQuestion();
      return;
    }
    persistSceneSnapshot(result);
  }

  function startNewScene() {
    if (scene.busy) return;
    scene.reset();
    setSceneSessionId(newSceneExplainSessionId());
    setPrompt("");
  }

  function openSceneSession(id: string) {
    if (scene.busy) return;
    const saved = getSceneExplainSession(id, user?.id);
    if (!saved) {
      if (user?.id) {
        setSceneSessions(migrateAnonSceneExplainSessions(user.id));
      } else {
        setSceneSessions(readSceneExplainSessions(null));
      }
      return;
    }
    setSceneMode(true);
    setSceneSessionId(saved.id);
    setPrompt(saved.prompt);
    scene.restore({
      title: saved.title,
      program: saved.program,
      code: saved.code,
      reveal: saved.reveal,
      logs: saved.logs,
      narration: saved.narration,
    });
  }

  function onPromptSubmit() {
    if (sceneMode) {
      void startSceneWithText(prompt.trim());
      return;
    }
    void startLesson();
  }

  async function openConversation(id: string) {
    if (status === "running") return;
    if (!accessToken) {
      openAuth("login");
      return;
    }
    const generation = lessonGenerationRef.current + 1;
    lessonGenerationRef.current = generation;
    historyAbortRef.current?.abort();
    const historyController = new AbortController();
    historyAbortRef.current = historyController;
    setSceneMode(false);
    setFollowUpPrompt("");
    prepareSoftContinue();
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: historyController.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        conversation: {
          conversationId: string;
          rootPrompt: string;
          title?: string | null;
          lessonId?: string;
          plan?: { sources?: LessonSource[] };
          turns: Array<{ role: string; content: string }>;
        };
        visualPlan?: VisualPlan | null;
        threeScene?: unknown;
        board?: {
          title: string;
          canvas: { width: number; height: number };
          commands: DrawCommand[];
          visualPlan: VisualPlan | null;
          threeScene: ThreeScenePlan | null;
        } | null;
      };
      if (
        historyController.signal.aborted ||
        generation !== lessonGenerationRef.current ||
        statusRef.current === "running"
      ) {
        return;
      }
      const ctx = data.conversation;
      setConversationId(ctx.conversationId);
      conversationIdRef.current = ctx.conversationId;
      setLessonId(ctx.lessonId);
      setTitle(
        data.board?.title || ctx.title || ctx.rootPrompt || "Lesson",
      );
      const lines = turnsToNarration(ctx.turns);
      setBoardNarration(lines);
      setLessonSources(ctx.plan?.sources ?? []);
      narrationSeqRef.current = lines.length;
      setCodeBuffer("");
      setPrompt("");
      setStatus("done");
      setDrawSpeech(null);

      const boardThree = data.board?.threeScene ?? null;
      const restoredThree =
        boardThree ??
        threeSceneFromChoiceOrNull(
          data.threeScene,
          ctx.title || ctx.rootPrompt || undefined,
        );

      drawQueue.clear();
      setDrawSessionKey((k) => k + 1);
      drawClockRef.current = 0;
      boardBottomYRef.current = 0;
      setBoardScrollToY(null);

      if (restoredThree) {
        setThreeSelected(null);
        setThreeScene({
          ...restoredThree,
          reveal: restoredThree.maxReveal,
        });
        setVisualPlan(null);
        lastVisualKeyRef.current = "";
        setPreferDrawEngine(false);
        setDrawPlaying(false);
        setBoardCanvasHeight(600);
      } else if (data.board?.commands?.length) {
        setThreeSelected(null);
        setThreeScene(null);
        const restoredPlan = data.board.visualPlan ?? data.visualPlan ?? null;
        if (restoredPlan) {
          lastVisualKeyRef.current = visualStableKey(restoredPlan);
          setVisualPlan(restoredPlan);
        } else {
          setVisualPlan(null);
          lastVisualKeyRef.current = "";
        }
        setBoardCanvasHeight(
          Math.max(600, data.board.canvas?.height ?? 600),
        );
        setPreferDrawEngine(true);
        // Replay the exact streamed commands so reopen matches generate.
        const cmds = data.board.commands;
        const minT = Math.min(...cmds.map((c) => c.t0));
        const rebased = cmds.map((c) => ({
          ...c,
          t0: Math.max(0, c.t0 - minT),
        }));
        drawQueue.enqueue(rebased);
        boardBottomYRef.current = Math.max(
          boardBottomYRef.current,
          commandsBottomY(rebased),
        );
        setBoardCanvasHeight((h) =>
          Math.max(h, boardBottomYRef.current + 80),
        );
        setDrawPlaying(true);
        setPlayKey((k) => k + 1);
      } else if (data.visualPlan || data.board?.visualPlan) {
        const plan = data.board?.visualPlan ?? data.visualPlan!;
        setThreeSelected(null);
        setThreeScene(null);
        lastVisualKeyRef.current = visualStableKey(plan);
        setVisualPlan(plan);
        setPreferDrawEngine(false);
        setDrawPlaying(false);
        setPlayKey((k) => k + 1);
      } else {
        setThreeSelected(null);
        setThreeScene(null);
        setVisualPlan(null);
        lastVisualKeyRef.current = "";
        setPreferDrawEngine(false);
        setDrawPlaying(false);
      }
      send({ type: "RESET" });
    } catch {
      // keep current view
    } finally {
      if (historyAbortRef.current === historyController) {
        historyAbortRef.current = null;
      }
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
      pauseLesson({ fromVisibility: false });
      return;
    }
    resumeLesson();
  }

  function skipBeat() {
    penCues.stopWaiting();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = audioRef.current.duration || 0;
      audioRef.current.dispatchEvent(new Event("ended"));
    }
  }

  const busy = sceneMode ? scene.busy : status === "running";

  return (
    <AppShell>
      <ChatSidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        conversations={sceneMode ? sceneListItems : conversations}
        activeId={sceneMode ? sceneSessionId : conversationId}
        loading={sceneMode ? false : chatsLoading}
        historyEyebrow={sceneMode ? "3D scenes" : ""}
        historyTitle={sceneMode ? "Your scenes" : undefined}
        emptyHint={
          sceneMode
            ? "Build a process — past scenes will show up here."
            : "Lessons you start will show up here."
        }
        newChatLabel={sceneMode ? "New scene" : undefined}
        ariaLabel={sceneMode ? "3D scene history" : undefined}
        showAuth={false}
        onSelect={(id) => {
          if (sceneMode) {
            openSceneSession(id);
            return;
          }
          void openConversation(id);
        }}
        onNewChat={() => {
          if (sceneMode) {
            startNewScene();
            return;
          }
          resetLesson();
          setPrompt("");
        }}
        username={user?.username}
        authLoading={authLoading}
        onLogin={() => openAuth("login")}
        onSignup={() => openAuth("signup")}
        onLogout={() => {
          void logout();
          resetLesson();
          setConversations([]);
          scene.reset();
          setSceneSessionId(newSceneExplainSessionId());
          setSceneSessions([]);
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppHeader
          current="lessons"
          title={
            sceneMode
              ? (scene.title ?? "Ask for any process")
              : (title ?? undefined)
          }
          brandCompact
          className="lesson-topbar"
          leading={
            sidebarCollapsed ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                aria-label={sceneMode ? "Show scenes" : "Show lessons"}
                aria-expanded={false}
              >
                <PanelLeft className="size-4" />
              </Button>
            ) : null
          }
          center={
            <PromptBar
              value={prompt}
              onChange={setPrompt}
              onSubmit={onPromptSubmit}
              disabled={sceneMode ? busy : status !== "idle"}
              inputId={sceneMode ? "scene-prompt" : "topic-prompt"}
              inputLabel={sceneMode ? "3D scene prompt" : "Lesson question"}
              placeholder={
                sceneMode
                  ? "Try “osmosis” or “how a comet orbits the sun”…"
                  : "What do you want to learn?"
              }
              submitLabel={
                sceneMode
                  ? scene.program
                    ? "Rebuild"
                    : "Build scene"
                  : "Start lesson"
              }
            />
          }
          actions={
            <div className="flex items-center gap-1.5">
              {canAskMe ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 max-w-[9.5rem] truncate rounded-lg border-[#d7e3eb] px-2.5 text-[12px] font-medium text-[#17324a] hover:bg-[#eef4f9] sm:max-w-none"
                  onClick={openAskMe}
                >
                  Ask me a question
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={sceneMode}
                className={
                  sceneMode
                    ? "h-8 rounded-lg border-[#1b6ca8]/35 bg-[#e8f2fa] px-2.5 text-[12px] font-medium text-[#1b6ca8]"
                    : "h-8 rounded-lg border-[#d7e3eb] px-2.5 text-[12px] font-medium text-[#17324a] hover:bg-[#eef4f9]"
                }
                onClick={() => {
                  setSceneMode((on) => !on);
                }}
              >
                3D
              </Button>
              {!sceneMode ? (
                <PaceControls
                  playing={status === "running"}
                  speed={speed}
                  onTogglePlay={togglePlay}
                  onSpeedChange={setSpeed}
                  onSkip={skipBeat}
                  disabled={status === "idle" && !prompt.trim()}
                />
              ) : null}
            </div>
          }
          account={
            <AccountMenu
              onLogin={() => openAuth("login")}
              onSignup={() => openAuth("signup")}
              onLogout={() => {
                void logout();
                resetLesson();
                setConversations([]);
                scene.reset();
                setSceneSessionId(newSceneExplainSessionId());
                setSceneSessions([]);
              }}
            />
          }
        >
          {!sceneMode && status === "running" ? (
            <PipelineActivity
              records={pipelineRecords}
              expanded={pipelineExpanded}
              onToggle={() => setPipelineExpanded((value) => !value)}
            />
          ) : null}
        </AppHeader>

        {sceneMode ? (
          <div className="relative flex min-h-0 flex-1 overflow-hidden">
            <div className="relative min-h-0 min-w-0 flex-1 bg-ink">
              <SceneViewport
                code={scene.code}
                frameKey={scene.frameKey}
                reveal={scene.reveal}
                onReady={scene.onFrameReady}
                onError={scene.onFrameError}
              />
              {scene.status === "building" || scene.status === "fixing" ? (
                <ThinkingLoader
                  variant="overlay"
                  label={
                    scene.status === "fixing"
                      ? "Repairing the scene"
                      : "Designing a detailed 3D scene"
                  }
                  className="bg-[radial-gradient(ellipse_at_50%_40%,rgba(26,43,60,0.55),rgba(26,43,60,0.72))] [&_p]:text-white [&_.thinking-shimmer]:bg-white/15 [&_.thinking-shimmer-beam]:via-white/70"
                />
              ) : null}
            </div>
            <div className="hidden h-full w-[min(26rem,38vw)] shrink-0 sm:block">
              <SceneAgentRail
                title={scene.title}
                streaming={sceneStreaming}
                logs={scene.logs}
                narration={scene.narration}
                emptyHint="As the scene builds, the spoken steps will land here so you can reread them."
                placement="side"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 z-30 sm:hidden">
              <SceneAgentRail
                title={scene.title}
                streaming={sceneStreaming}
                logs={scene.logs}
                narration={scene.narration}
                emptyHint="As the scene builds, the spoken steps will land here so you can reread them."
                placement="bottom"
              />
            </div>
          </div>
        ) : (
          <div className="relative min-h-0 flex-1">
            <VisualStage
              plan={visualPlan}
              playKey={playKey}
              title={title}
              beatOrder={beatOrder}
              totalBeats={totalBeats}
              narrationLines={boardNarration}
              sources={lessonSources}
              codeBuffer={codeBuffer}
              streaming={status === "running"}
              onDrawComplete={onDrawComplete}
              drawQueue={drawQueue}
              drawSessionKey={drawSessionKey}
              drawPlaying={drawPlaying && status !== "paused"}
              drawSpeed={speed}
              preferDrawEngine={preferDrawEngine}
              drawSpeech={drawSpeech}
              canvasHeight={boardCanvasHeight}
              scrollToY={boardScrollToY}
              threeScene={threeScene}
              threePlaying={status === "running"}
              threeSpeed={speed}
              threeSelectedStructure={threeSelected}
              onThreeSelect={setThreeSelected}
              onDrawClock={(ms) => {
                drawClockRef.current = ms;
              }}
              followUpValue={followUpPrompt}
              onFollowUpChange={setFollowUpPrompt}
              onFollowUpSubmit={() => {
                void askFollowUp();
              }}
              followUpDisabled={
                status === "running" || status === "paused"
              }
              showFollowUp={showFollowUp}
            />
            {status === "running" &&
            !visualPlan &&
            !threeScene &&
            !preferDrawEngine &&
            boardNarration.length === 0 ? (
              <ThinkingLoader
                variant="overlay"
                label={pipelineStatusLabel(
                  latestPipelineEvent(pipelineRecords),
                )}
              />
            ) : null}
          </div>
        )}
      </div>

      <Dialog
        open={showResumePrompt}
        onOpenChange={(open) => {
          if (!open) dismissResumePrompt();
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Resume lesson?</DialogTitle>
            <DialogDescription>
              The lesson paused when you left this tab. Want to pick up where
              you left off?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={dismissResumePrompt}>
              Stay paused
            </Button>
            <Button type="button" onClick={resumeLesson}>
              Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AskMeMcqDialog
        open={showAskMe}
        onOpenChange={setShowAskMe}
        conversationId={conversationId}
        title={title}
        narrationLines={askMeNarration}
      />
    </AppShell>
  );
}
