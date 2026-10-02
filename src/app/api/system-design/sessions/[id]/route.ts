import { getUserFromRequest } from "@/lib/auth/requestUser";
import { toUserFacingError } from "@/lib/errors/userFacing";
import { clipTitle } from "@/lib/experiment/lessonTitle";
import {
  SessionStoreMissing,
  deleteDesignSession,
  getDesignSession,
  renameDesignSession,
  updateDesignSession,
} from "@/lib/experiment/systemDesign/savedSessions";
import { readSessionBody } from "@/lib/experiment/systemDesign/sessionBody";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOT_FOUND = { error: "That saved design was not found." };

function failure(error: unknown, fallback: string) {
  if (error instanceof SessionStoreMissing) {
    return Response.json({ error: error.message, code: "store-missing" }, { status: 503 });
  }
  return Response.json({ error: toUserFacingError(error, fallback) }, { status: 500 });
}

export async function GET(request: Request, ctx: RouteCtx) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
    const { id } = await ctx.params;
    if (!UUID.test(id)) return Response.json(NOT_FOUND, { status: 404 });
    const found = await getDesignSession({ userId: user.id, id });
    if (!found) return Response.json(NOT_FOUND, { status: 404 });
    return Response.json(found);
  } catch (error) {
    return failure(error, "Could not open that design.");
  }
}

/** Saves the board's current state over an existing session. */
export async function PUT(request: Request, ctx: RouteCtx) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
    const { id } = await ctx.params;
    if (!UUID.test(id)) return Response.json(NOT_FOUND, { status: 404 });
    const body = await readSessionBody(request);
    if (!body.ok) return Response.json({ error: body.error }, { status: body.status });
    const summary = await updateDesignSession({
      userId: user.id,
      id,
      session: body.session,
      preview: body.preview,
    });
    if (!summary) return Response.json(NOT_FOUND, { status: 404 });
    return Response.json({ session: summary });
  } catch (error) {
    return failure(error, "Could not save this design. Try again.");
  }
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
    const { id } = await ctx.params;
    if (!UUID.test(id)) return Response.json(NOT_FOUND, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as { title?: unknown };
    const raw = typeof body.title === "string" ? body.title.trim() : "";
    if (!raw) return Response.json({ error: "A title is required." }, { status: 400 });
    const summary = await renameDesignSession({ userId: user.id, id, title: clipTitle(raw) });
    if (!summary) return Response.json(NOT_FOUND, { status: 404 });
    return Response.json({ session: summary });
  } catch (error) {
    return failure(error, "Could not rename that design.");
  }
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
    const { id } = await ctx.params;
    if (!UUID.test(id)) return Response.json(NOT_FOUND, { status: 404 });
    const ok = await deleteDesignSession({ userId: user.id, id });
    if (!ok) return Response.json(NOT_FOUND, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return failure(error, "Could not delete that design.");
  }
}
