import type { TutorView } from "@/lib/ai-tutor/types";

async function readView(response: Response): Promise<TutorView> {
  const payload = (await response.json()) as TutorView;
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "The tutor could not continue.");
  }
  return payload;
}

export async function startTutor(topic = "", language = ""): Promise<TutorView> {
  const response = await fetch("/api/ai-tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "start", topic, language }),
  });
  return readView(response);
}

export async function answerTutor(
  sessionId: string,
  text: string,
): Promise<TutorView> {
  const response = await fetch("/api/ai-tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "answer", sessionId, text }),
  });
  return readView(response);
}

export async function resetTutor(sessionId?: string): Promise<void> {
  await fetch("/api/ai-tutor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reset", sessionId }),
  });
}
