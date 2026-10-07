import type {
  BrowserAnnotation,
  BrowserAskResult,
  BrowserFollowUpResult,
  BrowserSessionPublic,
  BrowserStreamEvent,
  BrowserTeachBeat,
} from "@/lib/browser-experience/types";

async function readJson<T>(res: Response): Promise<T & { error?: string }> {
  try {
    return (await res.json()) as T & { error?: string };
  } catch {
    return { error: "Unexpected response from the browser tutor." } as T & {
      error?: string;
    };
  }
}

export async function requestBrowserAsk(
  prompt: string,
  options?: {
    sessionId?: string;
    signal?: AbortSignal;
    onEvent?: (event: BrowserStreamEvent) => void;
  },
): Promise<BrowserAskResult> {
  const res = await fetch("/api/browser-experience/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      ...(options?.sessionId ? { sessionId: options.sessionId } : {}),
    }),
    signal: options?.signal,
  });

  if (!res.ok || !res.body) {
    const body = await readJson<{ error?: string }>(res);
    throw new Error(
      body.error || "Could not start the browser lesson. Try again.",
    );
  }

  return consumeBrowserStream(res.body, options?.onEvent);
}

export async function requestBrowserFollowUp(
  sessionId: string,
  prompt: string,
  options?: {
    signal?: AbortSignal;
    onEvent?: (event: BrowserStreamEvent) => void;
  },
): Promise<BrowserFollowUpResult> {
  const res = await fetch("/api/browser-experience/follow-up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, prompt }),
    signal: options?.signal,
  });

  if (!res.ok || !res.body) {
    const body = await readJson<{ error?: string }>(res);
    throw new Error(body.error || "Could not answer that follow-up.");
  }

  return consumeBrowserStream(res.body, options?.onEvent);
}

async function consumeBrowserStream(
  body: ReadableStream<Uint8Array>,
  onEvent?: (event: BrowserStreamEvent) => void,
): Promise<BrowserAskResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let session: BrowserSessionPublic | null = null;
  let beats: BrowserTeachBeat[] = [];
  let summary = "";
  let streamError: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .map((part) => part.trim())
        .find((part) => part.startsWith("data:"));
      if (!line) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;
      let event: BrowserStreamEvent;
      try {
        event = JSON.parse(raw) as BrowserStreamEvent;
      } catch {
        continue;
      }
      onEvent?.(event);
      if (event.type === "session") session = event.session;
      if (event.type === "beats") {
        beats = event.beats;
        summary = event.summary;
      }
      if (event.type === "error") streamError = event.error;
    }
  }

  if (streamError) throw new Error(streamError);
  if (!session) {
    throw new Error("Could not start the browser lesson. Try again.");
  }
  return { session, beats, summary };
}

export async function annotateBrowserSession(
  sessionId: string,
  annotation: BrowserAnnotation,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/browser-experience/annotate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, annotation }),
    signal,
  });
  if (!res.ok) {
    const body = await readJson<{ error?: string }>(res);
    throw new Error(body.error || "Could not highlight that on the page.");
  }
}

export async function closeBrowserSession(sessionId: string): Promise<void> {
  await fetch("/api/browser-experience/session", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  }).catch(() => undefined);
}

export async function fetchBrowserFrame(
  sessionId: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const res = await fetch(
    `/api/browser-experience/frame?sessionId=${encodeURIComponent(sessionId)}`,
    { signal, cache: "no-store" },
  );
  if (!res.ok) return null;
  const body = await readJson<{ image?: string }>(res);
  return typeof body.image === "string" ? body.image : null;
}

export async function speakBrowserLine(
  text: string,
  signal?: AbortSignal,
): Promise<{ mimeType: string; base64: string } | null> {
  const res = await fetch("/api/experiment/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!res.ok) return null;
  const body = await readJson<{ mimeType?: string; base64?: string }>(res);
  if (!body.mimeType || !body.base64) return null;
  return { mimeType: body.mimeType, base64: body.base64 };
}
