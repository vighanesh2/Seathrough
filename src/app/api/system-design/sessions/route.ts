import { getUserFromRequest } from "@/lib/auth/requestUser";
import { toUserFacingError } from "@/lib/errors/userFacing";
import {
  SessionStoreMissing,
  insertDesignSession,
  listDesignSessions,
} from "@/lib/experiment/systemDesign/savedSessions";
import { readSessionBody } from "@/lib/experiment/systemDesign/sessionBody";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ sessions: [], error: "Sign in required" }, { status: 401 });
    }
    return Response.json({ sessions: await listDesignSessions(user.id) });
  } catch (error) {
    if (error instanceof SessionStoreMissing) {
      return Response.json({ sessions: [], error: error.message, code: "store-missing" }, { status: 503 });
    }
    return Response.json(
      { sessions: [], error: toUserFacingError(error, "Could not load saved designs.") },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
    const body = await readSessionBody(request);
    if (!body.ok) return Response.json({ error: body.error }, { status: body.status });
    const summary = await insertDesignSession({
      userId: user.id,
      title: body.title,
      session: body.session,
      preview: body.preview,
    });
    return Response.json({ session: summary });
  } catch (error) {
    if (error instanceof SessionStoreMissing) {
      return Response.json({ error: error.message, code: "store-missing" }, { status: 503 });
    }
    return Response.json(
      { error: toUserFacingError(error, "Could not save this design. Try again.") },
      { status: 500 },
    );
  }
}
