import { getServiceSupabase } from "@/lib/supabase/server";
import {
  parseSavedDesignSession,
  type SavedDesignSession,
  type SavedDesignSummary,
} from "@/lib/experiment/systemDesign/session";

const TABLE = "saved_design_sessions";
const SUMMARY_COLUMNS = "id, title, question, preview, created_at, updated_at";

/** The table from docs/supabase/008_saved_design_sessions.sql has not been created. */
export class SessionStoreMissing extends Error {
  constructor() {
    super("Saved designs are not set up in the database yet.");
  }
}

function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /saved_design_sessions/i.test(message) ||
    /schema cache/i.test(message)
  );
}

function fail(error: { message?: string; code?: string }): never {
  if (isMissingRelation(error)) throw new SessionStoreMissing();
  throw error;
}

function rowToSummary(row: Record<string, unknown>): SavedDesignSummary {
  const createdAt = String(row.created_at || new Date().toISOString());
  return {
    id: String(row.id),
    title: String(row.title || "System design"),
    question: typeof row.question === "string" ? row.question : "",
    createdAt,
    updatedAt: String(row.updated_at || createdAt),
    ...(typeof row.preview === "string" && row.preview ? { preview: row.preview } : {}),
  };
}

export async function listDesignSessions(userId: string, limit = 60): Promise<SavedDesignSummary[]> {
  const { data, error } = await getServiceSupabase()
    .from(TABLE)
    .select(SUMMARY_COLUMNS)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) fail(error);
  return ((data ?? []) as Record<string, unknown>[]).map(rowToSummary);
}

export async function insertDesignSession(input: {
  userId: string;
  title: string;
  session: SavedDesignSession;
  preview?: string;
}): Promise<SavedDesignSummary> {
  const { data, error } = await getServiceSupabase()
    .from(TABLE)
    .insert({
      user_id: input.userId,
      title: input.title,
      question: input.session.prompt,
      session: input.session,
      preview: input.preview ?? null,
    })
    .select(SUMMARY_COLUMNS)
    .single();
  if (error) fail(error);
  return rowToSummary(data as Record<string, unknown>);
}

/** Overwrites a saved design with the board's current state. The title is kept if the student renamed it. */
export async function updateDesignSession(input: {
  userId: string;
  id: string;
  session: SavedDesignSession;
  preview?: string;
}): Promise<SavedDesignSummary | null> {
  const { data, error } = await getServiceSupabase()
    .from(TABLE)
    .update({
      question: input.session.prompt,
      session: input.session,
      ...(input.preview ? { preview: input.preview } : {}),
    })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select(SUMMARY_COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? rowToSummary(data as Record<string, unknown>) : null;
}

export async function getDesignSession(input: {
  userId: string;
  id: string;
}): Promise<{ summary: SavedDesignSummary; session: SavedDesignSession } | null> {
  const { data, error } = await getServiceSupabase()
    .from(TABLE)
    .select(`${SUMMARY_COLUMNS}, session`)
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const parsed = parseSavedDesignSession(row.session);
  if (!parsed.ok) return null;
  return { summary: rowToSummary(row), session: parsed.session };
}

export async function renameDesignSession(input: {
  userId: string;
  id: string;
  title: string;
}): Promise<SavedDesignSummary | null> {
  const { data, error } = await getServiceSupabase()
    .from(TABLE)
    .update({ title: input.title })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select(SUMMARY_COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? rowToSummary(data as Record<string, unknown>) : null;
}

export async function deleteDesignSession(input: { userId: string; id: string }): Promise<boolean> {
  const { data, error } = await getServiceSupabase()
    .from(TABLE)
    .delete()
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select("id")
    .maybeSingle();
  if (error) fail(error);
  return Boolean(data);
}
