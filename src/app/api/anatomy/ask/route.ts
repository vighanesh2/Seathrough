import { generateGroundedAnatomyAnswer } from "@/lib/anatomy/answer";
import {
  citationsForKnowledge,
  retrieveCardiopulmonaryKnowledge,
} from "@/lib/anatomy/knowledge/cardiopulmonary";
import { anatomyQuestionRequestSchema } from "@/lib/anatomy/schemas";
import { getUserFromRequest } from "@/lib/auth/requestUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

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

  const entries = retrieveCardiopulmonaryKnowledge(
    parsed.data.question,
    parsed.data.selectedStructure,
  );
  if (!entries.length) {
    return Response.json({
      answer:
        "I do not have enough cardiopulmonary evidence in the reviewed source set to answer that reliably. Ask about heart chambers, valves, pulmonary blood flow, breathing, or alveolar gas exchange.",
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
