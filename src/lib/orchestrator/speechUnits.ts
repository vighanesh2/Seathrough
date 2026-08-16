import type { DrawCommand } from "@/lib/draw-engine/commands";

/** One short thing the tutor says while a specific bit gets written. */
export type SpeechUnit = {
  text: string;
  /** Board-clock time (server timeline) the pen reaches this unit's step. */
  cueT0: number;
};

/** Beyond this the TTS round trip and cue drift outweigh the sync benefit. */
const MAX_UNITS = 4;
/** Fragments shorter than this get folded into the sentence before them. */
const MIN_UNIT_CHARS = 20;

/**
 * Split narration into sentence-sized chunks a tutor would say between strokes.
 */
export function splitNarration(narration: string): string[] {
  const text = narration.trim();
  if (!text) return [];

  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const merged: string[] = [];
  for (const sentence of sentences) {
    const prev = merged[merged.length - 1];
    if (prev && (sentence.length < MIN_UNIT_CHARS || prev.length < MIN_UNIT_CHARS)) {
      merged[merged.length - 1] = `${prev} ${sentence}`;
      continue;
    }
    merged.push(sentence);
  }

  if (merged.length <= MAX_UNITS) return merged;

  // Fold the tail into the last allowed unit rather than dropping speech.
  const head = merged.slice(0, MAX_UNITS - 1);
  head.push(merged.slice(MAX_UNITS - 1).join(" "));
  return head;
}

/**
 * Distinct moments the pen starts something new in this beat — the natural
 * places for the voice to pick up the next sentence.
 */
export function drawStepCues(commands: DrawCommand[]): number[] {
  const cues = new Set<number>();
  for (const cmd of commands) {
    if (cmd.type === "pause" || cmd.type === "clear") continue;
    cues.add(cmd.t0);
  }
  return [...cues].sort((a, b) => a - b);
}

/** Aura-2 lands near 160 wpm; chars/sec is a steadier estimate than words. */
const CHARS_PER_SECOND = 14;
/** Never stretch a beat's writing past this — long pauses read as a stall. */
const MAX_BEAT_SPAN_MS = 22_000;

/** Roughly how long the tutor will be speaking this line. */
export function estimateSpeechMs(text: string): number {
  const chars = text.trim().length;
  if (!chars) return 0;
  return Math.round((chars / CHARS_PER_SECOND) * 1000) + 300;
}

/**
 * Spread a beat's writing steps across the time the tutor spends talking, so
 * the pen keeps working through the explanation instead of finishing in two
 * seconds and idling. Each stroke keeps its own speed; only the gaps grow.
 */
export function paceCommandsToNarration(
  commands: DrawCommand[],
  narration: string,
): DrawCommand[] {
  if (commands.length < 2) return commands;

  const cues = drawStepCues(commands);
  const first = cues[0];
  const last = cues[cues.length - 1];
  if (first == null || last == null || last <= first) return commands;

  const end = commands.reduce(
    (m, c) => Math.max(m, c.t0 + (c.durationMs || 0)),
    0,
  );
  const tailMs = end - last;
  const target = Math.min(estimateSpeechMs(narration), MAX_BEAT_SPAN_MS);
  const naturalSpan = end - first;
  if (target <= naturalSpan) return commands;

  const scale = (target - tailMs) / (last - first);
  if (!Number.isFinite(scale) || scale <= 1) return commands;

  return commands.map((c) => ({
    ...c,
    t0: Math.round(first + (c.t0 - first) * scale),
  }));
}

/**
 * Pair each sentence with the board time it should be spoken at, spreading the
 * sentences evenly over the beat's writing steps.
 */
export function buildSpeechUnits(
  narration: string,
  commands: DrawCommand[],
  fallbackT0: number,
): SpeechUnit[] {
  const texts = splitNarration(narration);
  if (!texts.length) return [];

  const cues = drawStepCues(commands);
  if (!cues.length) {
    return texts.map((text) => ({ text, cueT0: fallbackT0 }));
  }

  return texts.map((text, i) => {
    if (texts.length === 1) return { text, cueT0: cues[0]! };
    const ratio = i / (texts.length - 1);
    const index = Math.round(ratio * (cues.length - 1));
    return { text, cueT0: cues[index] ?? cues[cues.length - 1]! };
  });
}
