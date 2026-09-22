import type { ExperimentFollowup, ExperimentLesson } from "@/lib/experiment/scene";

export async function requestExperimentLesson(
  prompt: string,
  signal?: AbortSignal,
): Promise<ExperimentLesson> {
  const res = await fetch("/api/experiment/draw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal,
  });

  let body: { lesson?: ExperimentLesson; error?: string } = {};
  try {
    body = (await res.json()) as {
      lesson?: ExperimentLesson;
      error?: string;
    };
  } catch {
    throw new Error("Could not explain that. Try another question.");
  }

  if (!res.ok || !body.lesson?.beats?.length) {
    throw new Error(
      body.error || "Could not explain that. Try another question.",
    );
  }

  return body.lesson;
}

export async function requestExperimentSpeak(
  text: string,
  signal?: AbortSignal,
): Promise<{ mimeType: string; base64: string } | null> {
  const clipped = text.trim().slice(0, 900);
  if (!clipped) return null;
  const res = await fetch("/api/experiment/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: clipped }),
    signal,
  });
  if (res.status === 503) return null;
  if (!res.ok) return null;
  const body = (await res.json()) as {
    mimeType?: string;
    base64?: string;
  };
  if (!body.base64) return null;
  return { mimeType: body.mimeType || "audio/mpeg", base64: body.base64 };
}

export async function requestExperimentListen(
  audio: Blob,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/experiment/listen", {
    method: "POST",
    headers: {
      "Content-Type": audio.type || "audio/webm",
    },
    body: audio,
    signal,
  });
  let body: { transcript?: string; error?: string } = {};
  try {
    body = (await res.json()) as { transcript?: string; error?: string };
  } catch {
    throw new Error("Couldn't hear that. Try again.");
  }
  if (!res.ok || !body.transcript?.trim()) {
    throw new Error(body.error || "Couldn't hear that. Try again.");
  }
  return body.transcript.trim();
}

export async function requestExperimentReact(
  input: {
    topic: string;
    title: string;
    ask: string;
    expect: string;
    answer: string;
    lastSay: string;
  },
  signal?: AbortSignal,
): Promise<ExperimentFollowup> {
  const res = await fetch("/api/experiment/react", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  let body: { followup?: ExperimentFollowup; error?: string } = {};
  try {
    body = (await res.json()) as {
      followup?: ExperimentFollowup;
      error?: string;
    };
  } catch {
    throw new Error("Could not explain that. Try another question.");
  }
  if (!res.ok || !body.followup?.say) {
    throw new Error(
      body.error || "Could not explain that. Try another question.",
    );
  }
  return body.followup;
}

export async function playExperimentAudio(
  spoken: { mimeType: string; base64: string },
  signal?: AbortSignal,
) {
  const bytes = Uint8Array.from(atob(spoken.base64), (char) =>
    char.charCodeAt(0),
  );
  const blob = new Blob([bytes], { type: spoken.mimeType });
  const url = URL.createObjectURL(blob);
  try {
    const audio = new Audio(url);
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        audio.pause();
        reject(new DOMException("Aborted", "AbortError"));
      };
      if (signal?.aborted) {
        onAbort();
        return;
      }
      signal?.addEventListener("abort", onAbort, { once: true });
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      void audio.play().catch(() => resolve());
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
