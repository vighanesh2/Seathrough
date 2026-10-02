import { clipTitle } from "@/lib/experiment/lessonTitle";
import {
  parseSavedDesignSession,
  readPreview,
  sessionTitle,
  type SavedDesignSession,
} from "@/lib/experiment/systemDesign/session";

const MAX_BODY_CHARS = 1_000_000;

export async function readSessionBody(
  request: Request,
): Promise<
  | { ok: true; session: SavedDesignSession; title: string; preview?: string }
  | { ok: false; status: number; error: string }
> {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) {
    return { ok: false, status: 413, error: "This design is too large to save." };
  }
  let body: { session?: unknown; preview?: unknown; title?: unknown };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    return { ok: false, status: 400, error: "Send the design as JSON." };
  }
  const parsed = parseSavedDesignSession(body?.session);
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error };
  const given = typeof body.title === "string" ? body.title.trim() : "";
  return {
    ok: true,
    session: parsed.session,
    title: clipTitle(given || sessionTitle(parsed.session)),
    preview: readPreview(body.preview),
  };
}
