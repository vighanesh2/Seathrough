import { generateWhiteboardDrawing } from "@/lib/automatic-drawing/generateWhiteboardPlan";
import { envPresence } from "@/lib/env";
import { toUserFacingError } from "@/lib/errors/userFacing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const presence = envPresence();
    if (!presence.OPENAI_API_KEY && !presence.GROQ_API_KEY) {
      return Response.json(
        {
          error:
            "Add OPENAI_API_KEY (preferred) or GROQ_API_KEY to generate drawings.",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { description?: unknown };
    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    if (!description) {
      return Response.json(
        { error: "Description is required" },
        { status: 400 },
      );
    }
    if (description.length > 800) {
      return Response.json(
        { error: "Description is too long (max 800 characters)" },
        { status: 400 },
      );
    }

    const drawing = await generateWhiteboardDrawing(description);
    return Response.json({
      plan: drawing.plan,
      strokes: drawing.strokes,
      source: drawing.source,
      originalPrompt: drawing.originalPrompt,
      expandedPrompt: drawing.expandedPrompt,
    });
  } catch (error) {
    console.error("[automatic-drawing]", error);
    const message = toUserFacingError(error);
    const status =
      error instanceof Error && /required|too long|valid/i.test(error.message)
        ? 400
        : 500;
    return Response.json({ error: message }, { status });
  }
}
