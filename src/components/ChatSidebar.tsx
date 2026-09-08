"use client";

import { LogOut, PanelLeftClose, Plus } from "lucide-react";
import type { ConversationListItem } from "@/lib/conversations/types";
import { Button } from "@/components/ui/button";
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
  /** Override copy for non-lesson workspaces (e.g. 3D body). */
  historyTitle?: string;
  historyEyebrow?: string;
  newChatLabel?: string;
  emptyHint?: string;
  ariaLabel?: string;
  showAuth?: boolean;
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
  historyTitle = "Your lessons",
  historyEyebrow = "",
  newChatLabel = "New lesson",
  emptyHint = "Your lessons will show up here.",
  ariaLabel = "Lesson history",
  showAuth = true,
}: ChatSidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full min-w-0 shrink-0 flex-col overflow-hidden bg-[#f7fafc] transition-[width] duration-200 ease-out",
        collapsed
          ? "w-0 border-r-0"
          : "w-[min(16.5rem,78vw)] border-r border-[#d7e3eb]",
      )}
      aria-label={ariaLabel}
      aria-hidden={collapsed}
    >
      {collapsed ? null : (
        <>
          <div className="flex items-center justify-between gap-2 px-3.5 py-3">
            <div className="min-w-0">
              {historyEyebrow ? (
                <p className="text-[12px] font-medium text-muted">
                  {historyEyebrow}
                </p>
              ) : null}
              <p className="truncate text-[14px] font-semibold tracking-tight text-[#17324a]">
                {historyTitle}
              </p>
            </div>
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-[#6a7d90] transition hover:bg-white hover:text-[#17324a]"
              onClick={onToggle}
              aria-label="Hide history"
              aria-expanded
            >
              <PanelLeftClose className="size-4" />
            </button>
          </div>

          <div className="px-3 pb-3">
            <button
              type="button"
              onClick={onNewChat}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-[#d7e3eb] bg-white text-[13px] font-semibold text-[#17324a] transition hover:border-[#1b6ca8]/40 hover:text-[#1b6ca8]"
            >
              <Plus className="size-3.5" />
              {newChatLabel}
            </button>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="px-2 pb-3">
              {loading && !conversations.length ? (
                <div className="px-2 py-3">
                  <ThinkingLoader variant="inline" label="Loading history" />
                </div>
              ) : null}

              {!loading && !conversations.length ? (
                <p className="px-2 py-2 text-[12.5px] leading-5 text-[#6a7d90]">
                  {emptyHint}
                </p>
              ) : null}

              <ul className="flex min-w-0 flex-col">
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
                          "block w-full min-w-0 overflow-hidden rounded-lg px-2.5 py-2 text-left transition",
                          active
                            ? "bg-white text-[#17324a] shadow-[0_0_0_1px_#d7e3eb]"
                            : "text-[#3d5166] hover:bg-white/70",
                        )}
                      >
                        <p className="truncate text-[13px] font-medium">
                          {chat.title}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#8a9aab]">
                          {formatWhen(chat.updatedAt)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {showAuth ? (
            <div className="border-t border-[#d7e3eb] px-3 py-2.5">
              {authLoading ? (
                <p className="px-2 py-2 text-xs text-muted">…</p>
              ) : username ? (
                <div className="flex items-center justify-between gap-2 px-1">
                  <p className="truncate text-[13px] font-medium text-[#17324a]">
                    {username}
                  </p>
                  <Button variant="ghost" size="sm" onClick={onLogout}>
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
          ) : null}
        </>
      )}
    </aside>
  );
}
