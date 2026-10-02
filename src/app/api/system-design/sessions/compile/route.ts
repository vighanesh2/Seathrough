import { toUserFacingError } from "@/lib/errors/userFacing";
import { compileSystemDesign } from "@/lib/experiment/systemDesign/compile";
import { parseSavedDesignSession } from "@/lib/experiment/systemDesign/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_CHARS = 200_000;

/** Rebuilds the board for a saved design, whether it was kept in the cloud or on the device. */
export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) {
      return Response.json({ error: "This design is too large to open." }, { status: 413 });
    }
    let body: { session?: unknown };
    try {
      body = JSON.parse(text) as typeof body;
    } catch {
      return Response.json({ error: "Send the design as JSON." }, { status: 400 });
    }
    const parsed = parseSavedDesignSession(body?.session);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const lesson = await compileSystemDesign(parsed.session.spec, parsed.session.prompt);
    return Response.json({ session: parsed.session, lesson });
  } catch (error) {
    return Response.json(
      { error: toUserFacingError(error, "Could not open that design.") },
      { status: 500 },
    );
  }
}
