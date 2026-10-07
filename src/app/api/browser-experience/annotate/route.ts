import { toUserFacingError } from "@/lib/errors/userFacing";
import { annotateBodySchema } from "@/lib/browser-experience/schemas";
import { annotateSession } from "@/lib/browser-experience/sessionStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Session not found" }, { status: 400 });
  }

  const parsed = annotateBodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Session not found" }, { status: 400 });
  }

  try {
    const result = await annotateSession(
      parsed.data.sessionId,
      parsed.data.annotation,
    );
    return Response.json({ ok: true, result });
  } catch (error) {
    return Response.json(
      {
        error: toUserFacingError(
          error,
          "Could not highlight that on the page.",
        ),
      },
      { status: 500 },
    );
  }
}
