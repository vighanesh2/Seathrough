import { envPresence } from "@/lib/env";
import { toUserFacingError } from "@/lib/errors/userFacing";
import { repairSceneCode } from "@/lib/scene-explain/repairScene";
import { sceneRepairRequestSchema } from "@/lib/scene-explain/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const presence = envPresence();
  if (!presence.GROQ_API_KEY && presence.LLM_PROVIDER === "groq") {
    return Response.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sceneRepairRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Crash details are required to fix the scene." },
      { status: 400 },
    );
  }

  try {
    const code = await repairSceneCode(parsed.data);
    return Response.json({ code });
  } catch (error) {
    return Response.json(
      {
        error: toUserFacingError(
          error,
          "Something went wrong while repairing the 3D scene. Please try again.",
        ),
      },
      { status: 500 },
    );
  }
}
