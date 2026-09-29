import { NARRATION_LEAD, sceneStarts, type Plan } from "@/lib/explain-video/film";

export const NARRATION_SAMPLE_RATE = 48_000;

export type Narration =
  | { ok: true; clips: (AudioBuffer | null)[] }
  | { ok: false; reason: "unconfigured" | "failed" | "unsupported" };

type VoiceReply = {
  voices?: ({ mimeType: string; base64: string } | null)[];
  error?: string;
};

function audioContextAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.OfflineAudioContext !== "undefined";
}

function bytesFromBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function decode(base64: string): Promise<AudioBuffer | null> {
  try {
    const ctx = new OfflineAudioContext(1, 1, NARRATION_SAMPLE_RATE);
    const buffer = await ctx.decodeAudioData(bytesFromBase64(base64));
    return buffer.duration > 0.05 ? buffer : null;
  } catch {
    return null;
  }
}

/** Voice every scene's narration line. Individual scenes that fail come back as null. */
export async function recordNarration(lines: string[]): Promise<Narration> {
  if (!audioContextAvailable()) return { ok: false, reason: "unsupported" };
  let response: Response;
  try {
    response = await fetch("/api/explain-video/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines }),
    });
  } catch {
    return { ok: false, reason: "failed" };
  }
  const payload = (await response.json().catch(() => null)) as VoiceReply | null;
  if (response.status === 503) return { ok: false, reason: "unconfigured" };
  if (!response.ok || !Array.isArray(payload?.voices) || payload.voices.length !== lines.length) {
    return { ok: false, reason: "failed" };
  }
  const clips = await Promise.all(
    payload.voices.map((voice) => (voice?.base64 ? decode(voice.base64) : Promise.resolve(null))),
  );
  if (clips.every((clip) => clip === null)) return { ok: false, reason: "failed" };
  return { ok: true, clips };
}

/**
 * Lay every scene's line onto one mono track the length of the film. A line starts just after
 * its scene does and is cut at the scene's end so it never talks over the next picture.
 */
export async function mixNarration(plan: Plan, clips: (AudioBuffer | null)[]): Promise<AudioBuffer | null> {
  if (!audioContextAvailable()) return null;
  const total = plan.scenes.reduce((sum, scene) => sum + scene.seconds, 0);
  const length = Math.ceil(total * NARRATION_SAMPLE_RATE);
  if (length <= 0) return null;
  const ctx = new OfflineAudioContext(1, length, NARRATION_SAMPLE_RATE);
  const starts = sceneStarts(plan);
  let placed = 0;
  plan.scenes.forEach((scene, index) => {
    const clip = clips[index];
    if (!clip) return;
    const at = starts[index]! + NARRATION_LEAD;
    const room = Math.max(0, starts[index]! + scene.seconds - at);
    if (room <= 0) return;
    const source = ctx.createBufferSource();
    source.buffer = clip;
    const gain = ctx.createGain();
    const end = at + Math.min(clip.duration, room);
    gain.gain.setValueAtTime(1, Math.max(at, end - 0.12));
    gain.gain.linearRampToValueAtTime(0, end);
    source.connect(gain).connect(ctx.destination);
    source.start(at, 0, Math.min(clip.duration, room));
    placed += 1;
  });
  if (!placed) return null;
  return ctx.startRendering();
}
