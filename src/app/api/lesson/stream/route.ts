import { runLessonStream } from "@/lib/orchestrator/runLessonStream";
import { getUserFromRequest } from "@/lib/auth/requestUser";
import { toUserFacingError } from "@/lib/errors/userFacing";
import { envPresence } from "@/lib/env";
import type { StreamEvent } from "@/types/lesson";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  prompt?: string;
  withAudio?: boolean;
  mode?: "new" | "follow_up";
  conversationId?: string;
  visualSummary?: string;
};

function sseEncode(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = body.prompt?.trim() ?? "";
  if (!prompt) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  if (body.mode === "follow_up" && !body.conversationId?.trim()) {
    return Response.json(
      { error: "conversationId is required for follow-up questions" },
      { status: 400 },
    );
  }

  const presence = envPresence();
  if (!presence.GROQ_API_KEY && presence.LLM_PROVIDER === "groq") {
    return Response.json(
      { error: "GROQ_API_KEY is not configured" },
      { status: 500 },
    );
  }
  if (!presence.NEXT_PUBLIC_SUPABASE_URL || !presence.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json(
      { error: "Supabase server env is not configured" },
      { status: 500 },
    );
  }

  const withAudio =
    body.withAudio !== false && presence.DEEPGRAM_API_KEY === true;
  const user = await getUserFromRequest(request);
  if (!user) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(sseEncode(event)));
      };

      try {
        for await (const event of runLessonStream({
          prompt,
          withAudio,
          signal: request.signal,
          mode: body.mode === "follow_up" ? "follow_up" : "new",
          conversationId: body.conversationId?.trim(),
          visualSummary: body.visualSummary?.trim(),
          userId: user.id,
        })) {
          send(event);
          if (event.type === "error" || event.type === "done") {
            break;
          }
        }
      } catch (error) {
        const message = toUserFacingError(error);
        console.error(
          "[lesson-stream-route]",
          error instanceof Error ? error.message : error,
        );
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
