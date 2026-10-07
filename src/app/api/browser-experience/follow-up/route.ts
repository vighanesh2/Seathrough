import { envPresence } from "@/lib/env";
import { toUserFacingError } from "@/lib/errors/userFacing";
import { followUpBodySchema } from "@/lib/browser-experience/schemas";
import { runBrowserFollowUp } from "@/lib/browser-experience/runAsk";
import { browserExperienceSseResponse } from "@/lib/browser-experience/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(request: Request) {
  const presence = envPresence();
  if (!presence.GROQ_API_KEY && !presence.OPENAI_API_KEY) {
    return Response.json(
      { error: "Add GROQ_API_KEY or OPENAI_API_KEY to run the browser tutor." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  const parsed = followUpBodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  return browserExperienceSseResponse(async (send) => {
    try {
      await runBrowserFollowUp({
        sessionId: parsed.data.sessionId,
        prompt: parsed.data.prompt,
        onEvent: send,
      });
    } catch (error) {
      throw new Error(
        toUserFacingError(error, "Could not answer that follow-up."),
      );
    }
  });
}
