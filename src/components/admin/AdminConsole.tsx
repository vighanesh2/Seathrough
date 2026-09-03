"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { LogOut, MessageSquare, UserRound, Users } from "lucide-react";
import type { BoardNarrationLine } from "@/components/board/BoardNarration";
import { VisualStage } from "@/components/VisualStage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThinkingLoader } from "@/components/ui/ThinkingLoader";
import type { AdminUserRow } from "@/lib/admin/store";
import { ANONYMOUS_USER_KEY } from "@/lib/admin/store";
import type { ConversationListItem } from "@/lib/conversations/types";
import type { DrawCommand } from "@/lib/draw-engine/commands";
import { DrawCommandQueue } from "@/lib/draw-engine/resolve";
import {
  threeSceneFromChoiceOrNull,
  type ThreeScenePlan,
} from "@/lib/three-scenes/decide";
import type { VisualPlan } from "@/lib/visuals/types";
import { visualStableKey } from "@/lib/visuals/router";
import { cn } from "@/lib/utils";

type ConversationDetail = {
  conversationId: string;
  rootPrompt: string;
  title?: string | null;
  lessonId?: string;
  userId?: string | null;
  humanSummary?: string | null;
  turns: Array<{
    role: string;
    content: string;
    turnOrder?: number;
    createdAt?: string;
  }>;
};

type AdminConversationResponse = {
  conversation: ConversationDetail;
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

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return "Just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function turnsToNarration(
  turns: ConversationDetail["turns"],
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

function commandBottomY(cmd: DrawCommand): number {
  switch (cmd.type) {
    case "text":
      return cmd.y + (cmd.fontSize ?? 16);
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
  for (const c of commands) max = Math.max(max, commandBottomY(c));
  return max;
}

export function AdminConsole() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserKey, setSelectedUserKey] = useState<string | null>(null);

  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [chatsLoading, setChatsLoading] = useState(false);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [title, setTitle] = useState<string | undefined>();
  const [narration, setNarration] = useState<BoardNarrationLine[]>([]);
  const [visualPlan, setVisualPlan] = useState<VisualPlan | null>(null);
  const [threeScene, setThreeScene] = useState<ThreeScenePlan | null>(null);
  const [preferDrawEngine, setPreferDrawEngine] = useState(false);
  const [drawPlaying, setDrawPlaying] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [drawSessionKey, setDrawSessionKey] = useState(0);
  const [boardCanvasHeight, setBoardCanvasHeight] = useState(600);
  const [mobilePane, setMobilePane] = useState<"users" | "chats" | "view">(
    "users",
  );

  const drawQueue = useMemo(() => new DrawCommandQueue(), []);

  const selectedUser = users.find((u) => u.key === selectedUserKey) ?? null;

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const data = (await res.json()) as { authenticated?: boolean };
      setAuthed(Boolean(data.authenticated));
    } catch {
      setAuthed(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const data = (await res.json()) as {
        users?: AdminUserRow[];
        error?: string;
      };
      setUsers(data.users ?? []);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) void loadUsers();
  }, [authed, loadUsers]);

  const clearBoard = useCallback(() => {
    drawQueue.clear();
    setNarration([]);
    setVisualPlan(null);
    setThreeScene(null);
    setPreferDrawEngine(false);
    setDrawPlaying(false);
    setTitle(undefined);
    setDetailError(null);
    setBoardCanvasHeight(600);
    setDrawSessionKey((k) => k + 1);
  }, [drawQueue]);

  const loadConversations = useCallback(
    async (userKey: string) => {
      setChatsLoading(true);
      setConversations([]);
      setSelectedChatId(null);
      clearBoard();
      try {
        const res = await fetch(
          `/api/admin/conversations?user=${encodeURIComponent(userKey)}`,
          { cache: "no-store" },
        );
        if (res.status === 401) {
          setAuthed(false);
          return;
        }
        const data = (await res.json()) as {
          conversations?: ConversationListItem[];
        };
        setConversations(data.conversations ?? []);
      } catch {
        setConversations([]);
      } finally {
        setChatsLoading(false);
      }
    },
    [clearBoard],
  );

  async function openConversation(id: string) {
    setSelectedChatId(id);
    setDetailLoading(true);
    setDetailError(null);
    setMobilePane("view");
    try {
      const res = await fetch(`/api/admin/conversations/${id}`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setDetailError(data?.error || "Could not load this chat");
        clearBoard();
        return;
      }

      const data = (await res.json()) as AdminConversationResponse;
      const ctx = data.conversation;
      setTitle(data.board?.title || ctx.title || ctx.rootPrompt || "Lesson");
      setNarration(turnsToNarration(ctx.turns));

      const boardThree = data.board?.threeScene ?? null;
      const restoredThree =
        boardThree ??
        threeSceneFromChoiceOrNull(
          data.threeScene,
          ctx.title || ctx.rootPrompt || undefined,
        );

      drawQueue.clear();
      setDrawSessionKey((k) => k + 1);

      if (restoredThree) {
        setThreeScene({
          ...restoredThree,
          reveal: restoredThree.maxReveal,
        });
        setVisualPlan(null);
        setPreferDrawEngine(false);
        setDrawPlaying(false);
        setBoardCanvasHeight(600);
        setPlayKey((k) => k + 1);
      } else if (data.board?.commands?.length) {
        setThreeScene(null);
        const restoredPlan = data.board.visualPlan ?? data.visualPlan ?? null;
        setVisualPlan(restoredPlan);
        const cmds = data.board.commands;
        const minT = Math.min(...cmds.map((c) => c.t0));
        const rebased = cmds.map((c) => ({
          ...c,
          t0: Math.max(0, c.t0 - minT),
        }));
        drawQueue.enqueue(rebased);
        const bottom = commandsBottomY(rebased);
        setBoardCanvasHeight(
          Math.max(600, data.board.canvas?.height ?? 600, bottom + 80),
        );
        setPreferDrawEngine(true);
        setDrawPlaying(true);
        setPlayKey((k) => k + 1);
      } else if (data.visualPlan || data.board?.visualPlan) {
        const plan = data.board?.visualPlan ?? data.visualPlan!;
        setThreeScene(null);
        setVisualPlan(plan);
        void visualStableKey(plan);
        setPreferDrawEngine(false);
        setDrawPlaying(false);
        setPlayKey((k) => k + 1);
      } else {
        setThreeScene(null);
        setVisualPlan(null);
        setPreferDrawEngine(false);
        setDrawPlaying(false);
        setPlayKey((k) => k + 1);
      }
    } catch {
      setDetailError("Could not load this chat");
      clearBoard();
    } finally {
      setDetailLoading(false);
    }
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setLoginError(data?.error || "Wrong password");
        return;
      }
      setPassword("");
      setAuthed(true);
    } catch {
      setLoginError("Could not sign in");
    } finally {
      setLoggingIn(false);
    }
  }

  async function onLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setUsers([]);
    setConversations([]);
    setSelectedUserKey(null);
    setSelectedChatId(null);
    clearBoard();
  }

  if (authed === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-board">
        <ThinkingLoader variant="panel" label="Checking admin session" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(ellipse_at_top,#eef4ef,transparent_55%),linear-gradient(180deg,#f7f4ee,#ebe6dc)] px-4">
        <form
          onSubmit={onLogin}
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
            SeeThrough
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            Admin
          </h1>
          <p className="mt-1 text-sm text-muted">
            Enter the admin password to browse every learner chat.
          </p>
          <label className="mt-5 block text-xs font-medium text-ink">
            Password
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 h-10"
              placeholder="password"
              required
            />
          </label>
          {loginError ? (
            <p className="mt-2 text-sm text-error">{loginError}</p>
          ) : null}
          <Button type="submit" className="mt-4 w-full" disabled={loggingIn}>
            {loggingIn ? "Signing in…" : "Open admin"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 flex-col bg-board text-ink">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
            SeeThrough admin
          </p>
          <h1 className="truncate font-display text-lg font-semibold">
            Learner chats
          </h1>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onLogout}>
          <LogOut className="size-3.5" />
          Sign out
        </Button>
      </header>

      <div className="flex gap-1 border-b border-border bg-card px-2 py-1 md:hidden">
        {(
          [
            ["users", "Users"],
            ["chats", "Chats"],
            ["view", "View"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMobilePane(key)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium",
              mobilePane === key
                ? "bg-accent-soft text-accent-deep"
                : "text-muted hover:bg-secondary",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 md:grid-cols-[16rem_18rem_minmax(0,1fr)]">
        {/* Users */}
        <aside
          className={cn(
            "min-h-0 flex-col border-r border-border bg-card",
            mobilePane === "users" ? "flex" : "hidden md:flex",
          )}
        >
          <div className="shrink-0 border-b border-border px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Users className="size-3.5 text-accent-deep" />
              Learners
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {usersLoading ? (
              <div className="px-2 py-3">
                <ThinkingLoader variant="inline" label="Loading users" />
              </div>
            ) : null}
            {!usersLoading && !users.length ? (
              <p className="px-2 py-3 text-xs text-muted">No users yet.</p>
            ) : null}
            <ul className="flex flex-col gap-1">
              {users.map((user) => {
                const active = user.key === selectedUserKey;
                const isAnon = user.key === ANONYMOUS_USER_KEY;
                return (
                  <li key={user.key}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserKey(user.key);
                        setMobilePane("chats");
                        void loadConversations(user.key);
                      }}
                      className={cn(
                        "flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition-colors",
                        active
                          ? "bg-accent-soft/70 text-ink"
                          : "hover:bg-secondary",
                      )}
                    >
                      <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        {isAnon ? (
                          <UserRound className="size-3.5 shrink-0 text-muted" />
                        ) : null}
                        {user.username}
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted">
                        <span>
                          {user.conversationCount} chat
                          {user.conversationCount === 1 ? "" : "s"}
                        </span>
                        <span>{formatWhen(user.lastActiveAt)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Chats */}
        <aside
          className={cn(
            "min-h-0 flex-col border-r border-border bg-chalk/40",
            mobilePane === "chats" ? "flex" : "hidden md:flex",
          )}
        >
          <div className="shrink-0 border-b border-border px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <MessageSquare className="size-3.5 text-accent-deep" />
              {selectedUser
                ? selectedUser.key === ANONYMOUS_USER_KEY
                  ? "Anonymous chats"
                  : `${selectedUser.username}'s chats`
                : "Chats"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {!selectedUserKey ? (
              <p className="px-2 py-3 text-xs text-muted">
                Pick a learner (or Anonymous users) to see their chats.
              </p>
            ) : null}
            {selectedUserKey && chatsLoading ? (
              <div className="px-2 py-3">
                <ThinkingLoader variant="inline" label="Loading chats" />
              </div>
            ) : null}
            {selectedUserKey && !chatsLoading && !conversations.length ? (
              <p className="px-2 py-3 text-xs text-muted">
                No chats for this learner yet.
              </p>
            ) : null}
            <ul className="flex flex-col gap-1">
              {conversations.map((chat) => {
                const active = chat.id === selectedChatId;
                return (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => void openConversation(chat.id)}
                      className={cn(
                        "flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition-colors",
                        active
                          ? "bg-accent-soft/70 text-ink"
                          : "hover:bg-secondary",
                      )}
                    >
                      <span className="line-clamp-2 text-sm font-semibold leading-snug">
                        {chat.title}
                      </span>
                      {chat.preview ? (
                        <span className="mt-0.5 line-clamp-2 text-[11px] text-muted">
                          {chat.preview}
                        </span>
                      ) : null}
                      <span className="mt-1 text-[10px] text-muted">
                        {formatWhen(chat.updatedAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* View */}
        <section
          className={cn(
            "min-h-0 min-w-0 flex-col",
            mobilePane === "view" ? "flex" : "hidden md:flex",
          )}
        >
          {!selectedChatId ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <div>
                <p className="font-display text-xl text-ink">
                  Open a chat to inspect it
                </p>
                <p className="mt-1 text-sm text-muted">
                  You’ll see the same student ↔ tutor transcript they got, plus
                  the board snapshot when one was saved.
                </p>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <ThinkingLoader variant="panel" label="Loading lesson" />
            </div>
          ) : detailError ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-error">
              {detailError}
            </div>
          ) : (
            <div className="relative min-h-0 flex-1">
              <VisualStage
                plan={visualPlan}
                playKey={playKey}
                title={title}
                narrationLines={narration}
                streaming={false}
                drawQueue={drawQueue}
                drawSessionKey={drawSessionKey}
                drawPlaying={drawPlaying}
                drawSpeed={1}
                preferDrawEngine={preferDrawEngine}
                canvasHeight={boardCanvasHeight}
                threeScene={threeScene}
                threePlaying={false}
              />
              {!visualPlan && !threeScene && !preferDrawEngine ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-4 pt-3 md:pr-[min(380px,34vw)]">
                  <p className="rounded-lg border border-board-edge bg-card/90 px-3 py-1.5 text-xs text-muted shadow-sm">
                    No board snapshot saved — transcript on the right still
                    shows what was said.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
