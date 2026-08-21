"use client";

import { LogOut, PanelLeftClose, Plus } from "lucide-react";
import type { ConversationListItem } from "@/lib/conversations/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThinkingLoader } from "@/components/ui/ThinkingLoader";
import { cn } from "@/lib/utils";

type ChatSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  conversations: ConversationListItem[];
  activeId?: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  username?: string | null;
  authLoading?: boolean;
  onLogin: () => void;
  onSignup: () => void;
  onLogout: () => void;
};

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diff = now - d.getTime();
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

export function ChatSidebar({
  collapsed,
  onToggle,
  conversations,
  activeId,
  loading,
  onSelect,
  onNewChat,
  username,
  authLoading,
  onLogin,
  onSignup,
  onLogout,
}: ChatSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full min-w-0 shrink-0 flex-col overflow-hidden bg-card transition-[width] duration-200 ease-out",
        collapsed
          ? "w-0 border-r-0"
          : "w-[min(18rem,78vw)] border-r border-border",
      )}
      aria-label="Lesson history"
      aria-hidden={collapsed}
    >
      {collapsed ? null : (
        <>
          <div className="flex items-center justify-between gap-2 px-3 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                History
              </p>
              <p className="truncate text-sm font-semibold text-ink">
                Your lessons
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={onToggle}
              aria-label="Hide chats"
              aria-expanded
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </div>

          <div className="px-3 pb-2">
            <Button type="button" onClick={onNewChat} className="w-full">
              <Plus className="size-4" />
              New lesson
            </Button>
          </div>

          <Separator />

          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="p-2">
              {loading && !conversations.length ? (
                <div className="px-2 py-3">
                  <ThinkingLoader variant="inline" label="Loading chats" />
                </div>
              ) : null}

              {!loading && !conversations.length ? (
                <p className="px-2 py-3 text-xs leading-relaxed text-muted">
                  Your lessons will show up here.
                </p>
              ) : null}

              <ul className="flex min-w-0 flex-col gap-1">
                {conversations.map((chat) => {
                  const active = chat.id === activeId;
                  const preview = chat.preview || chat.rootPrompt;
                  return (
                    <li key={chat.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onSelect(chat.id)}
                        title={[chat.title, preview].filter(Boolean).join(" — ")}
                        className={cn(
                          "block w-full min-w-0 overflow-hidden rounded-xl px-3 py-2.5 text-left transition",
                          active
                            ? "bg-accent-soft text-accent-deep"
                            : "text-ink hover:bg-secondary",
                        )}
                      >
                        <p className="truncate text-sm font-medium">
                          {chat.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted">
                          {preview}
                        </p>
                        <p className="mt-1 text-[10px] text-muted">
                          {formatWhen(chat.updatedAt)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <Separator />

          <div className="px-3 py-2">
            {authLoading ? (
              <p className="px-2 py-2 text-xs text-muted">…</p>
            ) : username ? (
              <div className="flex flex-col gap-1.5">
                <p className="truncate px-1 text-xs text-muted">
                  Signed in as{" "}
                  <span className="font-semibold text-ink">{username}</span>
                </p>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  <LogOut className="size-3.5" />
                  Log out
                </Button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <Button size="sm" className="flex-1" onClick={onLogin}>
                  Log in
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={onSignup}
                >
                  Sign up
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
