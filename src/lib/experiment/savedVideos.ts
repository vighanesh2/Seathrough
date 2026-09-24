import { getServiceSupabase } from "@/lib/supabase/server";
import type { ExperimentLesson } from "@/lib/experiment/scene";

export type SavedVideoTitleSource = "ai" | "user" | "lesson";

export type SavedLessonVideo = {
  id: string;
  title: string;
  titleSource: SavedVideoTitleSource;
  question?: string;
  createdAt: string;
  durationMs?: number;
  mimeType: string;
  videoUrl?: string;
  posterUrl?: string;
};

const BUCKET = "lesson-videos";

function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /saved_lesson_videos/i.test(message) ||
    /schema cache/i.test(message)
  );
}

function asTitleSource(value: unknown): SavedVideoTitleSource {
  if (value === "user" || value === "ai" || value === "lesson") return value;
  return "lesson";
}

function rowToVideo(row: Record<string, unknown>): SavedLessonVideo {
  return {
    id: String(row.id),
    title: String(row.title || "Saved lesson"),
    titleSource: asTitleSource(row.title_source),
    question: typeof row.question === "string" ? row.question : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    durationMs:
      typeof row.duration_ms === "number" ? row.duration_ms : undefined,
    mimeType: String(row.mime_type || "video/webm"),
  };
}

async function signedUrl(path: string | null | undefined): Promise<string | undefined> {
  if (!path) return undefined;
  try {
    const supabase = getServiceSupabase();
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24);
    return data?.signedUrl;
  } catch {
    return undefined;
  }
}

export async function insertSavedLessonVideo(input: {
  userId: string;
  title: string;
  titleSource: SavedVideoTitleSource;
  question?: string;
  lesson: ExperimentLesson;
  video: Buffer;
  videoMime: string;
  poster?: Buffer;
  posterMime?: string;
  durationMs?: number;
}): Promise<SavedLessonVideo> {
  const supabase = getServiceSupabase();
  const id = crypto.randomUUID();
  const ext = input.videoMime.includes("mp4") ? "mp4" : "webm";
  const storagePath = `${input.userId}/${id}.${ext}`;
  const posterPath = input.poster
    ? `${input.userId}/${id}.jpg`
    : undefined;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, input.video, {
      contentType: input.videoMime,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  if (input.poster && posterPath) {
    await supabase.storage.from(BUCKET).upload(posterPath, input.poster, {
      contentType: input.posterMime || "image/jpeg",
      upsert: false,
    });
  }

  const { data, error } = await supabase
    .from("saved_lesson_videos")
    .insert({
      id,
      user_id: input.userId,
      title: input.title,
      title_source: input.titleSource,
      question: input.question ?? null,
      lesson: input.lesson,
      storage_path: storagePath,
      poster_path: posterPath ?? null,
      mime_type: input.videoMime,
      duration_ms: input.durationMs ?? null,
    })
    .select(
      "id, title, title_source, question, created_at, duration_ms, mime_type, storage_path, poster_path",
    )
    .single();

  if (error) throw error;
  const video = rowToVideo(data as Record<string, unknown>);
  const row = data as Record<string, unknown>;
  return {
    ...video,
    videoUrl: await signedUrl(String(row.storage_path)),
    posterUrl: await signedUrl(
      typeof row.poster_path === "string" ? row.poster_path : undefined,
    ),
  };
}

export async function listSavedLessonVideos(
  userId: string,
  limit = 40,
): Promise<SavedLessonVideo[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("saved_lesson_videos")
    .select(
      "id, title, title_source, question, created_at, duration_ms, mime_type, storage_path, poster_path",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    if (isMissingRelation(error)) {
      console.warn(
        "[saved-videos] cloud table is missing; dashboard will use copies on this device",
      );
      return [];
    }
    throw error;
  }
  const rows = (data ?? []) as Record<string, unknown>[];
  return Promise.all(
    rows.map(async (row) => ({
      ...rowToVideo(row),
      videoUrl: await signedUrl(String(row.storage_path)),
      posterUrl: await signedUrl(
        typeof row.poster_path === "string" ? row.poster_path : undefined,
      ),
    })),
  );
}

export async function renameSavedLessonVideo(input: {
  userId: string;
  id: string;
  title: string;
}): Promise<SavedLessonVideo | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("saved_lesson_videos")
    .update({ title: input.title, title_source: "user" })
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select(
      "id, title, title_source, question, created_at, duration_ms, mime_type, storage_path, poster_path",
    )
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    ...rowToVideo(row),
    videoUrl: await signedUrl(String(row.storage_path)),
    posterUrl: await signedUrl(
      typeof row.poster_path === "string" ? row.poster_path : undefined,
    ),
  };
}

export async function deleteSavedLessonVideo(input: {
  userId: string;
  id: string;
}): Promise<boolean> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("saved_lesson_videos")
    .delete()
    .eq("id", input.id)
    .eq("user_id", input.userId)
    .select("storage_path, poster_path")
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;
  const row = data as Record<string, unknown>;
  const paths = [row.storage_path, row.poster_path].filter(
    (path): path is string => typeof path === "string" && path.length > 0,
  );
  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
  return true;
}
