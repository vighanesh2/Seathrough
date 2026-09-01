import { latexToBoardText, looksLikeLatex } from "@/lib/math/latexToBoardText";

/** Unicode spaces that often sneak in from LLM output and clip oddly in UI. */
const UNICODE_SPACES = /[\u00a0\u202f\u2009\u200a\u200b\ufeff]/g;

/**
 * Readable text for the narration rail and captions.
 *
 * Tutor lines are spoken through TTS (which already expands math). The side
 * panel should show the same idea in plain form — never raw `\frac{...}`.
 */
export function formatNarrationForDisplay(input: string): string {
  let text = input.replace(UNICODE_SPACES, " ").trim();
  if (!text) return text;

  if (looksLikeLatex(text)) {
    text = latexToBoardText(text);
  }

  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}
