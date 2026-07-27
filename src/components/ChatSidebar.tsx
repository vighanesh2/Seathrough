"use client";

import type { ConversationListItem } from "@/lib/conversations/types";

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
      className={`flex h-full shrink-0 flex-col border-r border-board-edge bg-chalk/95 backdrop-blur-md transition-[width] duration-200 ease-out ${
        collapsed ? "w-14" : "w-[min(280px,78vw)]"
      }`}
      aria-label="Chat history"
    >
      <div
        className={`flex items-center gap-2 border-b border-board-edge ${
          collapsed ? "justify-center px-2 py-3" : "justify-between px-3 py-3"
        }`}
      >
        {!collapsed ? (
          <div className="min-w-0">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
              Chats
            </p>
            <p className="truncate font-display text-sm font-semibold text-ink">
              Your lessons
            </p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-board-edge text-ink-soft transition hover:border-accent hover:text-accent"
          aria-label={collapsed ? "Expand chat sidebar" : "Collapse chat sidebar"}
          aria-expanded={!collapsed}
        >
          <span aria-hidden className="font-sans text-sm">
            {collapsed ? "»" : "«"}
          </span>
        </button>
      </div>

      <div className={`border-b border-board-edge p-2 ${collapsed ? "px-1.5" : ""}`}>
        <button
          type="button"
          onClick={onNewChat}
          className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-accent font-sans text-sm font-semibold text-white transition hover:bg-accent-deep ${
            collapsed ? "px-0" : "px-3"
          }`}
          title="New lesson"
        >
          <span aria-hidden>+</span>
          {!collapsed ? <span>New lesson</span> : null}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading && !conversations.length ? (
          <p className="px-2 py-3 font-sans text-xs text-muted">Loading…</p>
        ) : null}

        {!loading && !conversations.length && !collapsed ? (
          <p className="px-2 py-3 font-sans text-xs leading-relaxed text-muted">
            Your lessons will show up here.
          </p>
        ) : null}

        <ul className="flex flex-col gap-1">
          {conversations.map((chat) => {
            const active = chat.id === activeId;
            return (
              <li key={chat.id}>
                <button
                  type="button"
                  onClick={() => onSelect(chat.id)}
                  title={chat.title}
                  className={`w-full rounded-xl text-left transition ${
                    collapsed ? "px-0 py-2" : "px-3 py-2.5"
                  } ${
                    active
                      ? "bg-accent-soft text-accent-deep"
                      : "hover:bg-paper-deep text-ink"
                  }`}
                >
                  {collapsed ? (
                    <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-paper-deep font-display text-xs font-semibold">
                      {(chat.title || "?").slice(0, 1).toUpperCase()}
                    </span>
                  ) : (
                    <>
                      <p className="truncate font-sans text-sm font-medium">
                        {chat.title}
                      </p>
                      <p className="mt-0.5 truncate font-sans text-[11px] text-muted">
                        {chat.preview || chat.rootPrompt}
                      </p>
                      <p className="mt-1 font-sans text-[10px] text-muted">
                        {formatWhen(chat.updatedAt)}
                      </p>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div
        className={`mt-auto border-t border-board-edge p-2 ${
          collapsed ? "px-1.5" : ""
        }`}
      >
        {authLoading ? (
          <p className="px-2 py-2 font-sans text-xs text-muted">…</p>
        ) : username ? (
          <div className={`flex flex-col gap-1.5 ${collapsed ? "items-center" : ""}`}>
            {!collapsed ? (
              <p className="truncate px-1 font-sans text-xs text-muted">
                Signed in as{" "}
                <span className="font-semibold text-ink">{username}</span>
              </p>
            ) : (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft font-display text-xs font-semibold text-accent-deep"
                title={username}
              >
                {username.slice(0, 1).toUpperCase()}
              </span>
            )}
            <button
              type="button"
              onClick={onLogout}
              className={`h-9 rounded-xl border border-board-edge font-sans text-xs font-medium text-ink-soft transition hover:border-accent hover:text-accent ${
                collapsed ? "w-9 px-0" : "w-full px-3"
              }`}
              title="Log out"
            >
              {collapsed ? "⎋" : "Log out"}
            </button>
          </div>
        ) : (
          <div className={`flex gap-1.5 ${collapsed ? "flex-col items-center" : ""}`}>
            <button
              type="button"
              onClick={onLogin}
              className={`h-9 rounded-xl bg-accent font-sans text-xs font-semibold text-white transition hover:bg-accent-deep ${
                collapsed ? "w-9 px-0" : "flex-1 px-3"
              }`}
              title="Log in"
            >
              {collapsed ? "→" : "Log in"}
            </button>
            {!collapsed ? (
              <button
                type="button"
                onClick={onSignup}
                className="h-9 flex-1 rounded-xl border border-board-edge px-3 font-sans text-xs font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
              >
                Sign up
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignup}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-board-edge font-sans text-xs font-semibold text-ink-soft"
                title="Sign up"
              >
                +
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
