import { loadConversationContext, summarizeTurnsForPrompt } from "@/lib/conversations/store";
import { envPresence } from "@/lib/env";
import { toUserFacingError } from "@/lib/errors/userFacing";
import { generateLessonMcq } from "@/lib/lesson/generateMcq";
import type { LessonPlanParsed } from "@/lib/schemas/lesson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  conversationId?: unknown;
  title?: unknown;
  narration?: unknown;
  excludeQuestions?: unknown;
};

function asTrimmedString(value: unknown, max = 400): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function asStringList(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((item) => item.slice(0, maxLen));
}

function planSnippetFromUnknown(plan: unknown): string | undefined {
  if (!plan || typeof plan !== "object") return undefined;
  const p = plan as Partial<LessonPlanParsed>;
  const beats = Array.isArray(p.beats)
    ? p.beats
        .slice(0, 10)
        .map((b) => (typeof b?.narration === "string" ? b.narration : ""))
        .filter(Boolean)
    : [];
  const parts = [
    typeof p.title === "string" ? p.title : "",
    typeof p.humanSummary === "string" ? p.humanSummary : "",
    ...beats,
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : undefined;
}

export async function POST(request: Request) {
  try {
    const presence = envPresence();
    if (!presence.GROQ_API_KEY && !presence.OPENAI_API_KEY) {
      return Response.json(
        { error: "Add GROQ_API_KEY or OPENAI_API_KEY to generate quiz questions." },
        { status: 503 },
      );
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const conversationId = asTrimmedString(body.conversationId, 80);
    const title = asTrimmedString(body.title, 160);
    const narrationLines = asStringList(body.narration, 24, 400);
    const excludeQuestions = asStringList(body.excludeQuestions, 8, 280);
    const narrationSoFar = narrationLines.join("\n").slice(0, 3500) || undefined;

    let rootPrompt: string | undefined;
    let humanSummary: string | undefined;
    let transcript: string | undefined;
    let planSnippet: string | undefined;
    let resolvedTitle = title;

    if (conversationId) {
      const ctx = await loadConversationContext(conversationId);
      if (ctx) {
        rootPrompt = ctx.rootPrompt;
        humanSummary = ctx.humanSummary ?? undefined;
        resolvedTitle = resolvedTitle || ctx.title || undefined;
        transcript = summarizeTurnsForPrompt(ctx.turns, 16);
        planSnippet = planSnippetFromUnknown(ctx.plan);
      }
    }

    if (
      !rootPrompt &&
      !resolvedTitle &&
      !humanSummary &&
      !transcript &&
      !planSnippet &&
      !narrationSoFar
    ) {
      return Response.json(
        { error: "Start a lesson first, then ask for a question." },
        { status: 400 },
      );
    }

    const mcq = await generateLessonMcq({
      rootPrompt,
      title: resolvedTitle,
      humanSummary,
      transcript,
      planSnippet,
      narrationSoFar,
      excludeQuestions,
    });

    return Response.json({ mcq });
  } catch (error) {
    console.error("[lesson-mcq]", error);
    const message = toUserFacingError(error);
    const status =
      error instanceof Error &&
      /not enough|required|empty|invalid json body|start a lesson/i.test(
        error.message,
      )
        ? 400
        : 500;
    return Response.json({ error: message }, { status });
  }
}
