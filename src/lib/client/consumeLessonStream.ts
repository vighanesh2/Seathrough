import { toUserFacingError } from "@/lib/errors/userFacing";
import type { StreamEvent } from "@/types/lesson";

export type ConsumeLessonOptions = {
  prompt: string;
  withAudio?: boolean;
  signal?: AbortSignal;
  mode?: "new" | "follow_up";
  conversationId?: string;
  visualSummary?: string;
  boardBottomY?: number;
  accessToken?: string | null;
  /** Pipe A clarify pick / confirmed rewrite. */
  confirmedTightAsk?: string;
  onEvent: (event: StreamEvent) => void | Promise<void>;
};

/**
 * Client consumer for POST /api/lesson/stream (SSE).
 */
export async function consumeLessonStream(
  options: ConsumeLessonOptions,
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetch("/api/lesson/stream", {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt: options.prompt,
      withAudio: options.withAudio,
      mode: options.mode,
      conversationId: options.conversationId,
      visualSummary: options.visualSummary,
      boardBottomY: options.boardBottomY,
      confirmedTightAsk: options.confirmedTightAsk,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    let message = `Lesson stream failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore
    }
    await options.onEvent({
      type: "error",
      message: toUserFacingError(message),
    });
    return;
  }

  if (!response.body) {
    await options.onEvent({
      type: "error",
      message: "Lesson stream returned an empty body",
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const payload = line.replace(/^data:\s*/, "");
      if (!payload) continue;

      let event: StreamEvent;
      try {
        event = JSON.parse(payload) as StreamEvent;
      } catch {
        continue;
      }

      if (event.type === "error") {
        event = {
          ...event,
          message: toUserFacingError(event.message),
        };
      }

      await options.onEvent(event);
      if (event.type === "done" || event.type === "error") {
        return;
      }
    }
  }

  await options.onEvent({
    type: "error",
    message: "Lesson stream ended before completion. Please try again.",
  });
}
