import { getUserFromRequest } from "@/lib/auth/requestUser";
import {
  listAnatomySessions,
  upsertAnatomySession,
} from "@/lib/anatomy/sessionStore";
import { anatomySessionSyncSchema } from "@/lib/anatomy/sessionSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function persistenceUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  return (
    value.code === "42P01" ||
    value.code === "PGRST205" ||
    (typeof value.message === "string" &&
      value.message.includes("anatomy_conversations"))
  );
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json(
      { error: "Sign in required", sessions: [] },
      { status: 401 },
    );
  }

  try {
    const sessions = await listAnatomySessions(user.id);
    return Response.json(
      { sessions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error: persistenceUnavailable(error)
          ? "Anatomy history storage is not configured."
          : "Anatomy history is temporarily unavailable.",
        sessions: [],
      },
      { status: persistenceUnavailable(error) ? 503 : 500 },
    );
  }
}

export async function PUT(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = anatomySessionSyncSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid anatomy conversation",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const session = await upsertAnatomySession(user.id, parsed.data.session);
    return Response.json(
      { session },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error: persistenceUnavailable(error)
          ? "Anatomy history storage is not configured."
          : "Could not save anatomy history.",
      },
      { status: persistenceUnavailable(error) ? 503 : 500 },
    );
  }
}
