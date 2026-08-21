import { getUserFromRequest } from "@/lib/auth/requestUser";
import { envPresence } from "@/lib/env";
import { toUserFacingError } from "@/lib/errors/userFacing";
import { generateSceneProgram } from "@/lib/scene-explain/generateScene";
import { sceneGenerateRequestSchema } from "@/lib/scene-explain/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

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

  const parsed = sceneGenerateRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Enter a topic between 1 and 600 characters." },
      { status: 400 },
    );
  }

  try {
    const program = await generateSceneProgram(parsed.data);
    return Response.json(program);
  } catch (error) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: number }).status)
        : undefined;
    console.error(
      "[scene-explain/generate] failed",
      status ? `status=${status}` : error instanceof Error ? error.name : "error",
    );
    return Response.json(
      {
        error: toUserFacingError(
          error,
          "Something went wrong while building the 3D scene. Please try again in a moment.",
        ),
      },
      { status: 500 },
    );
  }
}
