import { getUserFromRequest } from "@/lib/auth/requestUser";
import { envPresence } from "@/lib/env";
import { toUserFacingError } from "@/lib/errors/userFacing";
import { synthesizeSpeech } from "@/lib/providers/tts";
import { sceneSpeakRequestSchema } from "@/lib/scene-explain/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const presence = envPresence();
  if (!presence.DEEPGRAM_API_KEY) {
    return Response.json(
      { error: "Voice is not configured." },
      { status: 503 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sceneSpeakRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Nothing to speak." },
      { status: 400 },
    );
  }

  try {
    const spoken = await synthesizeSpeech(parsed.data.text);
    return Response.json(spoken);
  } catch (error) {
    return Response.json(
      {
        error: toUserFacingError(
          error,
          "Couldn't speak that line. The explanation is still on the right.",
        ),
      },
      { status: 500 },
    );
  }
}
