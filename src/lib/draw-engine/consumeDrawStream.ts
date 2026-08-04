import type { DrawStreamEvent } from "@/lib/draw-engine/commands";
import { drawCommandSchema } from "@/lib/draw-engine/commands";
import { toUserFacingError } from "@/lib/errors/userFacing";

export type ConsumeDrawStreamOptions = {
  signal?: AbortSignal;
  /** Demo prompt hint for the mock planner. */
  prompt?: string;
  onEvent: (event: DrawStreamEvent) => void | Promise<void>;
};

/**
 * Client consumer for POST /api/draw-engine/demo (SSE timed command stream).
 */
export async function consumeDrawStream(
  options: ConsumeDrawStreamOptions,
): Promise<void> {
  const response = await fetch("/api/draw-engine/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: options.prompt ?? "" }),
    signal: options.signal,
  });

  if (!response.ok) {
    let message = `Draw stream failed (${response.status})`;
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
      message: "Draw stream returned an empty body",
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
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }

      const event = coerceDrawStreamEvent(parsed);
      if (event) await options.onEvent(event);
    }
  }
}

function coerceDrawStreamEvent(raw: unknown): DrawStreamEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { type?: string };

  switch (obj.type) {
    case "session_start": {
      const e = raw as DrawStreamEvent & { type: "session_start" };
      if (!e.title || !e.canvas) return null;
      return e;
    }
    case "cmd": {
      const command = drawCommandSchema.safeParse(
        (raw as { command?: unknown }).command,
      );
      if (!command.success) return null;
      return { type: "cmd", command: command.data };
    }
    case "cmds": {
      const list = (raw as { commands?: unknown }).commands;
      if (!Array.isArray(list)) return null;
      const commands = [];
      for (const item of list) {
        const parsed = drawCommandSchema.safeParse(item);
        if (parsed.success) commands.push(parsed.data);
      }
      if (!commands.length) return null;
      return { type: "cmds", commands };
    }
    case "speak": {
      const e = raw as DrawStreamEvent & { type: "speak" };
      if (typeof e.text !== "string" || typeof e.t0 !== "number") return null;
      return e;
    }
    case "done":
      return { type: "done" };
    case "error": {
      const message =
        typeof (raw as { message?: unknown }).message === "string"
          ? (raw as { message: string }).message
          : "Draw stream error";
      return { type: "error", message };
    }
    default:
      return null;
  }
}
