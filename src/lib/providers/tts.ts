import { getDeepgramConfig } from "@/lib/env";
import { mathToSpeech } from "@/lib/math/mathToSpeech";

export type TtsResult = {
  mimeType: string;
  base64: string;
};

/**
 * Deepgram Aura-2 TTS. Returns audio as base64 for SSE delivery.
 */
export async function synthesizeSpeech(text: string): Promise<TtsResult> {
  const spoken = mathToSpeech(text);
  if (!spoken) {
    throw new Error("TTS text is empty");
  }

  const { apiKey, model } = getDeepgramConfig();
  const url = new URL("https://api.deepgram.com/v1/speak");
  url.searchParams.set("model", model);
  url.searchParams.set("encoding", "mp3");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: spoken }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Deepgram TTS failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    mimeType: "audio/mpeg",
    base64: buffer.toString("base64"),
  };
}
