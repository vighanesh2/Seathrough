import { generateGroundedAnatomyAnswer } from "@/lib/anatomy/answer";
import { citationsForKnowledge } from "@/lib/anatomy/knowledge/shared";
import { retrieveCardiopulmonaryKnowledge } from "@/lib/anatomy/knowledge/cardiopulmonary";
import { retrieveEyeKnowledge } from "@/lib/anatomy/knowledge/eye";
import { anatomyQuestionRequestSchema } from "@/lib/anatomy/schemas";
import type { AnatomySceneId } from "@/lib/anatomy/types";
import { EYE_STRUCTURE_IDS } from "@/lib/anatomy/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveSceneId(
  requested: AnatomySceneId | undefined,
  selectedStructure: string | null | undefined,
): AnatomySceneId {
  if (requested === "eye" || requested === "cardiopulmonary") return requested;
  if (
    selectedStructure &&
    (EYE_STRUCTURE_IDS as readonly string[]).includes(selectedStructure)
  ) {
    return "eye";
  }
  return "cardiopulmonary";
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = anatomyQuestionRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Enter a question between 1 and 600 characters.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const sceneId = resolveSceneId(
    parsed.data.sceneId,
    parsed.data.selectedStructure,
  );
  const entries =
    sceneId === "eye"
      ? retrieveEyeKnowledge(
          parsed.data.question,
          parsed.data.selectedStructure,
        )
      : retrieveCardiopulmonaryKnowledge(
          parsed.data.question,
          parsed.data.selectedStructure,
        );

  if (!entries.length) {
    return Response.json({
      answer:
        sceneId === "eye"
          ? "I do not have enough eye/vision evidence in the reviewed source set to answer that reliably. Ask about the light path, cornea, lens focus, pupil, retina, rods and cones, or signals to the brain."
          : "I do not have enough cardiopulmonary evidence in the reviewed source set to answer that reliably. Ask about heart chambers, valves, pulmonary blood flow, breathing, or alveolar gas exchange.",
      citations: [],
      focusStructures: parsed.data.selectedStructure
        ? [parsed.data.selectedStructure]
        : [],
      animationMode: parsed.data.sceneMode ?? "overview",
      reveal: 6,
      supported: false,
    });
  }

  try {
    const answer = await generateGroundedAnatomyAnswer({
      question: parsed.data.question,
      selectedStructure: parsed.data.selectedStructure,
      entries,
      sceneId,
      signal: request.signal,
    });
    return Response.json(answer, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[anatomy-ask-route]", message);
    const missingConfiguration = message.includes(
      "Missing required environment variable",
    );
    return Response.json(
      {
        error: missingConfiguration
          ? "The anatomy answer service is not configured."
          : "The anatomy answer service is temporarily unavailable.",
        retryable: !missingConfiguration,
        citations: citationsForKnowledge(entries),
      },
      { status: missingConfiguration ? 503 : 502 },
    );
  }
}
