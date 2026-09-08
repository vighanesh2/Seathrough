import { anatomySessionSchema } from "@/lib/anatomy/sessionSchema";
import type { AnatomySession } from "@/lib/anatomy/sessionHistory";
import { getServiceSupabase } from "@/lib/supabase/server";

type AnatomyConversationRow = {
  id: unknown;
  title: unknown;
  scene_id: unknown;
  animation_mode: unknown;
  reveal: unknown;
  selected_structure: unknown;
  focused_structures: unknown;
  turns: unknown;
  created_at: unknown;
  client_updated_at: unknown;
};

function fromRow(row: AnatomyConversationRow): AnatomySession | null {
  const parsed = anatomySessionSchema.safeParse({
    id: row.id,
    title: row.title,
    sceneId: row.scene_id,
    mode: row.animation_mode,
    reveal: row.reveal,
    selected: row.selected_structure,
    focused: row.focused_structures,
    turns: row.turns,
    createdAt: row.created_at,
    updatedAt: row.client_updated_at,
  });
  return parsed.success ? parsed.data : null;
}

function toRow(session: AnatomySession, userId: string) {
  return {
    user_id: userId,
    id: session.id,
    title: session.title,
    scene_id: session.sceneId,
    animation_mode: session.mode,
    reveal: session.reveal,
    selected_structure: session.selected,
    focused_structures: session.focused,
    turns: session.turns,
    turn_count: session.turns.length,
    created_at: session.createdAt,
    client_updated_at: session.updatedAt,
  };
}

const SELECT_COLUMNS =
  "id, title, scene_id, animation_mode, reveal, selected_structure, focused_structures, turns, created_at, client_updated_at";

export async function listAnatomySessions(
  userId: string,
  limit = 40,
): Promise<AnatomySession[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.round(limit)));
  const { data, error } = await getServiceSupabase()
    .from("anatomy_conversations")
    .select(SELECT_COLUMNS)
    .eq("user_id", userId)
    .order("client_updated_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return (data ?? [])
    .map((row) => fromRow(row as AnatomyConversationRow))
    .filter((session): session is AnatomySession => Boolean(session));
}

export async function upsertAnatomySession(
  userId: string,
  value: unknown,
): Promise<AnatomySession> {
  const session = anatomySessionSchema.parse(value);
  const client = getServiceSupabase();
  const row = toRow(session, userId);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: currentRow, error: readError } = await client
      .from("anatomy_conversations")
      .select(SELECT_COLUMNS)
      .eq("user_id", userId)
      .eq("id", session.id)
      .maybeSingle();
    if (readError) throw readError;

    const current = currentRow
      ? fromRow(currentRow as AnatomyConversationRow)
      : null;
    if (currentRow && !current) {
      throw new Error("Stored anatomy conversation failed validation");
    }
    if (current) {
      const incomingIsNewer =
        session.turns.length > current.turns.length ||
        (session.turns.length === current.turns.length &&
          session.updatedAt > current.updatedAt);
      if (!incomingIsNewer) return current;

      const { data: updatedRow, error: updateError } = await client
        .from("anatomy_conversations")
        .update({ ...row, created_at: current.createdAt })
        .eq("user_id", userId)
        .eq("id", session.id)
        .eq("turn_count", current.turns.length)
        .eq("client_updated_at", current.updatedAt)
        .select(SELECT_COLUMNS)
        .maybeSingle();
      if (updateError) throw updateError;
      if (updatedRow) {
        const updated = fromRow(updatedRow as AnatomyConversationRow);
        if (updated) return updated;
        throw new Error("Saved anatomy conversation failed validation");
      }
      continue;
    }

    const { data: insertedRow, error: insertError } = await client
      .from("anatomy_conversations")
      .insert(row)
      .select(SELECT_COLUMNS)
      .single();
    if (!insertError) {
      const inserted = fromRow(insertedRow as AnatomyConversationRow);
      if (inserted) return inserted;
      throw new Error("Saved anatomy conversation failed validation");
    }
    if (insertError.code !== "23505") throw insertError;
  }

  throw new Error("Anatomy conversation changed during save; please retry");
}
