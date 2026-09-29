import { z } from "zod";
import { envPresence } from "@/lib/env";
import { SPEAK_MAX } from "@/lib/explain-video/film";
import { synthesizeSpeech, type TtsResult } from "@/lib/providers/tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VOICE_CONCURRENCY = 3;

const voiceRequestSchema = z.object({
  lines: z.array(z.string().trim().min(1).max(SPEAK_MAX)).min(1).max(7),
});

async function voiceLine(line: string, index: number): Promise<TtsResult | null> {
  try {
    return await synthesizeSpeech(line);
  } catch (error) {
    console.error(
      "[explain-video] narration failed",
      index + 1,
      error instanceof Error ? error.message.slice(0, 200) : "unknown error",
    );
    return null;
  }
}

export async function POST(request: Request) {
  if (!envPresence().DEEPGRAM_API_KEY) {
    return Response.json({ error: "Voice is not configured." }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = voiceRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Nothing to narrate." }, { status: 400 });
  }

  const lines = parsed.data.lines;
  const voices: (TtsResult | null)[] = new Array(lines.length).fill(null);
  let next = 0;
  const worker = async () => {
    while (next < lines.length) {
      const index = next;
      next += 1;
      voices[index] = await voiceLine(lines[index]!, index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(VOICE_CONCURRENCY, lines.length) }, worker));

  if (voices.every((voice) => voice === null)) {
    return Response.json({ error: "The narration could not be recorded." }, { status: 502 });
  }
  return Response.json({ voices });
}
