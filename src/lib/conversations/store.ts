import { getServiceSupabase } from "@/lib/supabase/server";
import type {
  ConversationContext,
  ConversationListItem,
  ConversationTurn,
  TurnRole,
} from "@/lib/conversations/types";

export type {
  ConversationContext,
  ConversationListItem,
  ConversationTurn,
  TurnRole,
} from "@/lib/conversations/types";

type MemoryConversation = {
  id: string;
  rootPrompt: string;
  title?: string | null;
  lessonId?: string;
  plan?: unknown;
  humanSummary?: string | null;
  userId?: string | null;
  turns: ConversationTurn[];
};

const memory = new Map<string, MemoryConversation>();

function nextOrder(turns: ConversationTurn[]): number {
  if (!turns.length) return 1;
  return Math.max(...turns.map((t) => t.turnOrder)) + 1;
}

/**
 * Start a conversation for a new lesson prompt.
 * Falls back to in-memory if Supabase table is missing.
 */
export async function createConversation(input: {
  rootPrompt: string;
  title?: string;
  userId?: string | null;
}): Promise<{ conversationId: string; source: "supabase" | "memory" }> {
  const rootPrompt = input.rootPrompt.trim();
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        root_prompt: rootPrompt,
        title: input.title ?? null,
        user_id: input.userId ?? null,
      })
      .select("id")
      .single();

    if (error) throw error;
    const conversationId = data.id as string;
    memory.set(conversationId, {
      id: conversationId,
      rootPrompt,
      title: input.title,
      userId: input.userId ?? null,
      turns: [],
    });
    return { conversationId, source: "supabase" };
  } catch {
    const conversationId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `mem-${Date.now()}`;
    memory.set(conversationId, {
      id: conversationId,
      rootPrompt,
      title: input.title,
      userId: input.userId ?? null,
      turns: [],
    });
    return { conversationId, source: "memory" };
  }
}

export async function appendTurn(input: {
  conversationId: string;
  lessonId?: string | null;
  role: TurnRole;
  content: string;
  meta?: Record<string, unknown>;
}): Promise<ConversationTurn> {
  const content = input.content.trim();
  if (!content) {
    throw new Error("Turn content is empty");
  }

  const mem = memory.get(input.conversationId) ?? {
    id: input.conversationId,
    rootPrompt: "",
    turns: [],
  };
  const turnOrder = nextOrder(mem.turns);
  const turn: ConversationTurn = {
    conversationId: input.conversationId,
    lessonId: input.lessonId ?? null,
    turnOrder,
    role: input.role,
    content,
    meta: input.meta ?? {},
  };
  mem.turns.push(turn);
  memory.set(input.conversationId, mem);

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("lesson_turns")
      .insert({
        conversation_id: input.conversationId,
        lesson_id: input.lessonId ?? null,
        turn_order: turnOrder,
        role: input.role,
        content,
        meta: input.meta ?? {},
      })
      .select("id, created_at")
      .single();

    if (!error && data) {
      turn.id = data.id as string;
      turn.createdAt = data.created_at as string;
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", input.conversationId);
    }
  } catch {
    // memory already updated
  }

  return turn;
}

export async function loadConversationContext(
  conversationId: string,
): Promise<ConversationContext | null> {
  const mem = memory.get(conversationId);

  try {
    const supabase = getServiceSupabase();
    const { data: convo, error: convoError } = await supabase
      .from("conversations")
      .select("id, root_prompt, title, user_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (convoError) throw convoError;
    if (!convo) {
      if (!mem) return null;
      return {
        conversationId: mem.id,
        rootPrompt: mem.rootPrompt,
        title: mem.title,
        lessonId: mem.lessonId,
        userId: mem.userId ?? null,
        plan: mem.plan,
        humanSummary: mem.humanSummary,
        turns: mem.turns,
      };
    }

    const { data: turns } = await supabase
      .from("lesson_turns")
      .select("id, conversation_id, lesson_id, turn_order, role, content, meta, created_at")
      .eq("conversation_id", conversationId)
      .order("turn_order", { ascending: true });

    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, plan, human_summary, title")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const mapped: ConversationTurn[] = (turns ?? []).map((t) => ({
      id: t.id as string,
      conversationId: t.conversation_id as string,
      lessonId: (t.lesson_id as string | null) ?? null,
      turnOrder: t.turn_order as number,
      role: t.role as TurnRole,
      content: t.content as string,
      meta: (t.meta as Record<string, unknown>) ?? {},
      createdAt: t.created_at as string,
    }));

    const ctx: ConversationContext = {
      conversationId,
      rootPrompt: convo.root_prompt as string,
      title: (convo.title as string | null) ?? lesson?.title ?? null,
      lessonId: (lesson?.id as string | undefined) ?? mem?.lessonId,
      userId: (convo.user_id as string | null) ?? mem?.userId ?? null,
      plan: lesson?.plan ?? mem?.plan,
      humanSummary:
        (lesson?.human_summary as string | null | undefined) ??
        mem?.humanSummary ??
        null,
      turns: mapped.length ? mapped : (mem?.turns ?? []),
    };

    memory.set(conversationId, {
      id: conversationId,
      rootPrompt: ctx.rootPrompt,
      title: ctx.title,
      lessonId: ctx.lessonId,
      userId: ctx.userId,
      plan: ctx.plan,
      humanSummary: ctx.humanSummary,
      turns: ctx.turns,
    });

    return ctx;
  } catch {
    if (!mem) return null;
    return {
      conversationId: mem.id,
      rootPrompt: mem.rootPrompt,
      title: mem.title,
      lessonId: mem.lessonId,
      userId: mem.userId ?? null,
      plan: mem.plan,
      humanSummary: mem.humanSummary,
      turns: mem.turns,
    };
  }
}

export async function attachLessonToConversation(input: {
  conversationId: string;
  lessonId: string;
  title?: string;
  plan?: unknown;
  humanSummary?: string | null;
}): Promise<void> {
  const mem = memory.get(input.conversationId) ?? {
    id: input.conversationId,
    rootPrompt: "",
    turns: [],
  };
  mem.lessonId = input.lessonId;
  if (input.title) mem.title = input.title;
  if (input.plan !== undefined) mem.plan = input.plan;
  if (input.humanSummary !== undefined) mem.humanSummary = input.humanSummary;
  memory.set(input.conversationId, mem);

  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("lessons")
      .update({ conversation_id: input.conversationId })
      .eq("id", input.lessonId);
    await supabase
      .from("conversations")
      .update({
        title: input.title ?? mem.title ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.conversationId);
  } catch {
    // memory already updated
  }
}

export async function listConversations(
  limit = 40,
  userId?: string | null,
): Promise<ConversationListItem[]> {
  // Never list chats without a signed-in user
  if (!userId) return [];

  const fromMemory = (): ConversationListItem[] =>
    [...memory.values()]
      .filter((c) => c.userId === userId)
      .map((c) => {
        const lastStudent = [...c.turns]
          .reverse()
          .find((t) => t.role === "student");
        return {
          id: c.id,
          title: (c.title || c.rootPrompt || "Untitled lesson").slice(0, 80),
          rootPrompt: c.rootPrompt,
          updatedAt: new Date().toISOString(),
          preview: lastStudent?.content.slice(0, 100),
        };
      })
      .slice(0, limit);

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from("conversations")
      .select("id, root_prompt, title, updated_at, created_at, user_id")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data?.length) return fromMemory();

    const items: ConversationListItem[] = data.map((row) => {
      const id = row.id as string;
      const mem = memory.get(id);
      const lastStudent = mem?.turns
        .filter((t) => t.role === "student")
        .at(-1)?.content;
      return {
        id,
        title: (
          (row.title as string | null) ||
          mem?.title ||
          (row.root_prompt as string) ||
          "Untitled lesson"
        ).slice(0, 80),
        rootPrompt: (row.root_prompt as string) || mem?.rootPrompt || "",
        updatedAt:
          (row.updated_at as string) ||
          (row.created_at as string) ||
          new Date().toISOString(),
        preview:
          lastStudent?.slice(0, 100) ||
          (row.root_prompt as string)?.slice(0, 100),
      };
    });

    const seen = new Set(items.map((i) => i.id));
    for (const m of fromMemory()) {
      if (!seen.has(m.id)) items.unshift(m);
    }
    return items.slice(0, limit);
  } catch {
    return fromMemory();
  }
}

export function summarizeTurnsForPrompt(
  turns: ConversationTurn[],
  limit = 12,
): string {
  const recent = turns.slice(-limit);
  if (!recent.length) return "(no prior turns yet)";
  return recent
    .map((t) => `${t.role.toUpperCase()}: ${t.content}`)
    .join("\n");
}
