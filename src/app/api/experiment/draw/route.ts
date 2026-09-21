import { generateExperimentLesson } from "@/lib/experiment/generateScene";
import { simpleShapeLesson } from "@/lib/experiment/scene";
import { envPresence } from "@/lib/env";
import { toUserFacingError } from "@/lib/errors/userFacing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { prompt?: unknown };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (prompt.length > 800) {
      return Response.json(
        { error: "Prompt is too long (max 800 characters)" },
        { status: 400 },
      );
    }

    const simple = simpleShapeLesson(prompt);
    if (simple) {
      return Response.json({ lesson: simple });
    }

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

    const lesson = await generateExperimentLesson(prompt);
    return Response.json({ lesson });
  } catch (error) {
    console.error("[experiment-draw]", error);
    const message = toUserFacingError(
      error,
      "Could not explain that. Try another question.",
    );
    const status =
      error instanceof Error && /required|too long/i.test(error.message)
        ? 400
        : 500;
    return Response.json({ error: message }, { status });
  }
}
