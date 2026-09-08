import { getServiceSupabase } from "@/lib/supabase/server";
import type { ConversationListItem } from "@/lib/conversations/types";

export const ANONYMOUS_USER_KEY = "anonymous";

export type AdminUserRow = {
  /** Auth user id, or null for the anonymous bucket. */
  id: string | null;
  key: string;
  username: string;
  displayName?: string | null;
  conversationCount: number;
  lastActiveAt: string | null;
};

function asIso(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  return value;
}

function titleFromRow(row: {
  title?: string | null;
  root_prompt?: string | null;
}): string {
  return (
    row.title?.trim() ||
    row.root_prompt?.trim() ||
    "Untitled lesson"
  ).slice(0, 80);
}

/**
 * Signed-in profiles with chat counts, plus an Anonymous users bucket
 * for conversations / lessons with null user_id.
 */
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = getServiceSupabase();

  const [{ data: profiles, error: profilesError }, { data: convos, error: convoError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, updated_at, created_at")
        .order("username", { ascending: true }),
      supabase
        .from("conversations")
        .select("id, user_id, updated_at, created_at"),
    ]);

  if (profilesError) throw profilesError;
  if (convoError) throw convoError;

  const byUser = new Map<
    string,
    { count: number; lastActiveAt: string | null }
  >();
  let anonymousCount = 0;
  let anonymousLast: string | null = null;

  for (const row of convos ?? []) {
    const updated =
      asIso(row.updated_at) ?? asIso(row.created_at) ?? null;
    const userId = (row.user_id as string | null) ?? null;
    if (!userId) {
      anonymousCount += 1;
      if (
        updated &&
        (!anonymousLast || Date.parse(updated) > Date.parse(anonymousLast))
      ) {
        anonymousLast = updated;
      }
      continue;
    }
    const prev = byUser.get(userId) ?? { count: 0, lastActiveAt: null };
    prev.count += 1;
    if (
      updated &&
      (!prev.lastActiveAt ||
        Date.parse(updated) > Date.parse(prev.lastActiveAt))
    ) {
      prev.lastActiveAt = updated;
    }
    byUser.set(userId, prev);
  }

  const users: AdminUserRow[] = (profiles ?? []).map((p) => {
    const stats = byUser.get(p.id as string);
    return {
      id: p.id as string,
      key: p.id as string,
      username: p.username as string,
      displayName: (p.display_name as string | null) ?? null,
      conversationCount: stats?.count ?? 0,
      lastActiveAt:
        stats?.lastActiveAt ??
        asIso(p.updated_at) ??
        asIso(p.created_at),
    };
  });

  // Users who have chats but no profile row (edge case)
  const profileIds = new Set(users.map((u) => u.id));
  for (const [userId, stats] of byUser) {
    if (profileIds.has(userId)) continue;
    users.push({
      id: userId,
      key: userId,
      username: `user-${userId.slice(0, 8)}`,
      displayName: null,
      conversationCount: stats.count,
      lastActiveAt: stats.lastActiveAt,
    });
  }

  users.sort((a, b) => {
    const aT = a.lastActiveAt ? Date.parse(a.lastActiveAt) : 0;
    const bT = b.lastActiveAt ? Date.parse(b.lastActiveAt) : 0;
    if (bT !== aT) return bT - aT;
    return a.username.localeCompare(b.username);
  });

  users.unshift({
    id: null,
    key: ANONYMOUS_USER_KEY,
    username: "Anonymous users",
    displayName: "Not signed in",
    conversationCount: anonymousCount,
    lastActiveAt: anonymousLast,
  });

  return users;
}

export async function listAdminConversations(input: {
  userKey: string;
  limit?: number;
}): Promise<ConversationListItem[]> {
  const limit = Math.min(Math.max(input.limit ?? 80, 1), 200);
  const supabase = getServiceSupabase();

  let query = supabase
    .from("conversations")
    .select("id, root_prompt, title, updated_at, created_at, user_id")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (input.userKey === ANONYMOUS_USER_KEY) {
    query = query.is("user_id", null);
  } else {
    query = query.eq("user_id", input.userKey);
  }

  const { data, error } = await query;
  if (error) throw error;

  const ids = (data ?? []).map((row) => row.id as string);
  const previewById = new Map<string, string>();

  if (ids.length) {
    const { data: turns } = await supabase
      .from("lesson_turns")
      .select("conversation_id, role, content, turn_order")
      .in("conversation_id", ids)
      .eq("role", "student")
      .order("turn_order", { ascending: false });

    for (const turn of turns ?? []) {
      const cid = turn.conversation_id as string;
      if (previewById.has(cid)) continue;
      previewById.set(cid, String(turn.content ?? "").slice(0, 100));
    }
  }

  return (data ?? []).map((row) => {
    const id = row.id as string;
    return {
      id,
      title: titleFromRow({
        title: row.title as string | null,
        root_prompt: row.root_prompt as string | null,
      }),
      rootPrompt: (row.root_prompt as string) || "",
      updatedAt:
        asIso(row.updated_at) ??
        asIso(row.created_at) ??
        new Date().toISOString(),
      preview:
        previewById.get(id) ||
        (row.root_prompt as string)?.slice(0, 100) ||
        undefined,
    };
  });
}
