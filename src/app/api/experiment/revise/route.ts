import { parseIntakeAnswers } from "@/lib/experiment/systemDesign/answers";
import { RevisionRejected, reviseSystemDesign } from "@/lib/experiment/systemDesign/revise";
import {
  MAX_EDIT_HISTORY,
  designGaps,
  parseSystemDesignSpec,
} from "@/lib/experiment/systemDesign/spec";
import { envPresence } from "@/lib/env";
import { toUserFacingError } from "@/lib/errors/userFacing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_INSTRUCTION = 500;

export async function POST(request: Request) {
  try {
    let body: {
      prompt?: unknown;
      answers?: unknown;
      spec?: unknown;
      instruction?: unknown;
      edits?: unknown;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return Response.json({ error: "Send the design as JSON." }, { status: 400 });
    }

    const instruction =
      typeof body.instruction === "string" ? body.instruction.trim() : "";
    if (!instruction) {
      return Response.json({ error: "Say what to change." }, { status: 400 });
    }
    if (instruction.length > MAX_INSTRUCTION) {
      return Response.json(
        { error: `That change is too long (max ${MAX_INSTRUCTION} characters).` },
        { status: 400 },
      );
    }
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt || prompt.length > 800) {
      return Response.json({ error: "Start a system design first." }, { status: 400 });
    }
    const answers = parseIntakeAnswers(body.answers);
    if (!answers.ok) {
      return Response.json({ error: "Start a system design first." }, { status: 400 });
    }
    const spec = parseSystemDesignSpec(body.spec);
    if (spec.boxes.length < 2 || designGaps(spec).length) {
      return Response.json(
        { error: "This design is incomplete. Start the system design again." },
        { status: 400 },
      );
    }

    const presence = envPresence();
    if (!presence.OPENAI_API_KEY && !presence.GROQ_API_KEY) {
      return Response.json(
        { error: "Add OPENAI_API_KEY (preferred) or GROQ_API_KEY to edit designs." },
        { status: 503 },
      );
    }

    const edits = (Array.isArray(body.edits) ? body.edits : [])
      .filter((edit): edit is string => typeof edit === "string")
      .map((edit) => edit.trim().slice(0, MAX_INSTRUCTION))
      .filter(Boolean)
      .slice(-MAX_EDIT_HISTORY);

    const revision = await reviseSystemDesign({
      prompt,
      answers: answers.answers,
      spec,
      instruction,
      edits,
      signal: request.signal,
    });
    return Response.json({ revision });
  } catch (error) {
    if (error instanceof RevisionRejected) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    console.error("[experiment-revise]", error);
    return Response.json(
      { error: toUserFacingError(error, "Could not change the design. Try again.") },
      { status: 500 },
    );
  }
}
