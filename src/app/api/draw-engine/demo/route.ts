import { buildDemoCommandPlan } from "@/lib/draw-engine/demoPlan";
import type { DrawStreamEvent } from "@/lib/draw-engine/commands";
import {
  DRAW_CANVAS_HEIGHT,
  DRAW_CANVAS_WIDTH,
} from "@/lib/draw-engine/commands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sse(data: DrawStreamEvent): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * Mock planner SSE: dribbles timed draw commands (+ speak cues)
 * so the client can start animating within ~100–300ms.
 */
export async function POST(request: Request) {
  let prompt = "";
  try {
    const body = (await request.json()) as { prompt?: unknown };
    prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  } catch {
    prompt = "";
  }

  const { title, commands, speaks } = buildDemoCommandPlan(prompt);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: DrawStreamEvent) => {
        controller.enqueue(encoder.encode(sse(event)));
      };

      const sleep = (ms: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, ms));

      try {
        send({
          type: "session_start",
          title,
          canvas: { width: DRAW_CANVAS_WIDTH, height: DRAW_CANVAS_HEIGHT },
          serverTimeMs: Date.now(),
        });

        // Small lead-in so the client mounts the stage before first cmd.
        await sleep(80);

        // Merge speaks + commands by t0 and stream with gaps matching timeline.
        type Item =
          | { kind: "cmd"; t0: number; event: DrawStreamEvent }
          | { kind: "speak"; t0: number; event: DrawStreamEvent };

        const items: Item[] = [
          ...speaks.map((s) => ({
            kind: "speak" as const,
            t0: s.t0,
            event: { type: "speak" as const, text: s.text, t0: s.t0 },
          })),
          ...commands.map((c) => ({
            kind: "cmd" as const,
            t0: c.t0,
            event: { type: "cmd" as const, command: c },
          })),
        ].sort((a, b) => a.t0 - b.t0);

        let lastT = 0;
        for (const item of items) {
          if (request.signal.aborted) break;
          const wait = Math.max(0, Math.min(1200, item.t0 - lastT));
          // Stream earlier than the animation clock so client queues ahead.
          const networkLead = Math.min(wait, 180);
          await sleep(networkLead);
          send(item.event);
          lastT = item.t0;
        }

        await sleep(200);
        send({ type: "done" });
      } catch (error) {
        send({
          type: "error",
          message:
            error instanceof Error ? error.message : "Draw stream failed",
        });
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
    },
  });
}
