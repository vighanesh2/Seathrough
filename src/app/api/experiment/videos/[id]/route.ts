import { getUserFromRequest } from "@/lib/auth/requestUser";
import { toUserFacingError } from "@/lib/errors/userFacing";
import { clipTitle } from "@/lib/experiment/lessonTitle";
import {
  deleteSavedLessonVideo,
  renameSavedLessonVideo,
} from "@/lib/experiment/savedVideos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error: "Sign in required" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const body = (await request.json()) as { title?: unknown };
    const title = clipTitle(typeof body.title === "string" ? body.title : "");
    if (!title) {
      return Response.json({ error: "A title is required." }, { status: 400 });
    }
    const video = await renameSavedLessonVideo({
      userId: user.id,
      id,
      title,
    });
    if (!video) {
      return Response.json({ error: "Video not found." }, { status: 404 });
    }
    return Response.json({ video });
  } catch (error) {
    return Response.json(
      { error: toUserFacingError(error, "Could not rename that video.") },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, ctx: RouteCtx) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return Response.json({ error: "Sign in required" }, { status: 401 });
    }
    const { id } = await ctx.params;
    const ok = await deleteSavedLessonVideo({ userId: user.id, id });
    if (!ok) {
      return Response.json({ error: "Video not found." }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: toUserFacingError(error, "Could not delete that video.") },
      { status: 500 },
    );
  }
}
