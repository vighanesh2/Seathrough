/**
 * Step 5 — Voice gate constants and checks.
 * Pane text IS the script. No second narration track.
 */

export const VOICE_MAX_WORDS = 120;
export const VOICE_MAX_SECONDS = 75;

/** Rough spoken-words estimate for Deepgram-paced English. */
export function countSpokenWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function estimateSpokenSeconds(text: string): number {
  // ~2.2 words/sec conversational teaching pace
  return countSpokenWords(text) / 2.2;
}

/**
 * Keyword soup / telegram: many content tokens, almost no verbs/function words.
 * Heuristic only — critic LLM is primary; this is a hard local reject.
 */
export function looksLikeKeywordSoup(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;

  const verbLike =
    /\b(is|are|was|were|be|been|being|has|have|had|do|does|did|can|may|will|would|should|must|need|needs|push|pull|fall|falls|store|stores|call|calls|send|sends|check|checks|write|writes|add|adds|mean|means|stay|stays|go|goes|come|comes|use|uses|make|makes|keep|keeps|find|finds|turn|turns|open|opens|stop|stops)\b/i;
  const sentencePunct = /[.!?]/.test(trimmed);
  const verbHits = words.filter((w) => verbLike.test(w)).length;
  const avgLen =
    words.reduce((sum, w) => sum + w.replace(/[^a-z0-9]/gi, "").length, 0) /
    words.length;

  // Telegram: no sentence punctuation, few/no verbs, short choppy tokens
  if (!sentencePunct && verbHits === 0 && words.length <= 14) return true;
  if (!sentencePunct && verbHits <= 1 && avgLen <= 7 && words.length <= 16) {
    return true;
  }
  return false;
}

export type VoiceGateResult = {
  ok: boolean;
  wordCount: number;
  estimatedSeconds: number;
  reasons: string[];
};

export function evaluateVoiceGate(paneText: string): VoiceGateResult {
  const wordCount = countSpokenWords(paneText);
  const estimatedSeconds = estimateSpokenSeconds(paneText);
  const reasons: string[] = [];

  if (looksLikeKeywordSoup(paneText)) {
    reasons.push("keyword_soup");
  }
  if (wordCount > VOICE_MAX_WORDS) {
    reasons.push(`over_word_cap:${wordCount}>${VOICE_MAX_WORDS}`);
  }
  if (estimatedSeconds > VOICE_MAX_SECONDS) {
    reasons.push(
      `over_time_cap:${estimatedSeconds.toFixed(1)}s>${VOICE_MAX_SECONDS}s`,
    );
  }

  return {
    ok: reasons.length === 0,
    wordCount,
    estimatedSeconds,
    reasons,
  };
}

/** Join beat narrations into one spoken script for the canvas. */
export function joinPaneScript(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}
