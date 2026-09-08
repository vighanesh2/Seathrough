import { latexToBoardText, looksLikeLatex } from "@/lib/math/latexToBoardText";

/** Unicode spaces that often sneak in from LLM output and clip oddly in UI. */
const UNICODE_SPACES = /[\u00a0\u202f\u2009\u200a\u200b\ufeff]/g;

const LEARNER_STATE_PREFIX =
  /^(?:(?:now|so|therefore),?\s+)?i\s+(?:(?:now|finally)\s+)?(?:see|understand|grasp|know|learned|mastered|have\s+(?:learned|understood|mastered))\s+(?:(?:that|how|why)\s+)?/i;

function capitalizeSentence(text: string): string {
  return text.replace(/^([a-z])/, (letter) => letter.toUpperCase());
}

/**
 * Tutor copy must not claim the learner's internal state.
 * Keep the actual recap and next step, only removing phrases such as
 * "Now I see how..." or "I have mastered...".
 */
export function removeLearnerStateClaims(input: string): string {
  const sentences = input.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [input];

  return sentences
    .map((sentence) => {
      const trimmed = sentence.trim();
      const withoutClaim = trimmed.replace(LEARNER_STATE_PREFIX, "").trim();
      if (withoutClaim === trimmed) return trimmed;
      if (
        !withoutClaim ||
        /^(?:this|the)\s+(?:topic|concept|lesson)\b/i.test(withoutClaim)
      ) {
        return "";
      }
      return capitalizeSentence(withoutClaim);
    })
    .filter(Boolean)
    .join(" ");
}

/**
 * Readable text for the narration rail and captions.
 *
 * Tutor lines are spoken through TTS (which already expands math). The side
 * panel should show the same idea in plain form — never raw `\frac{...}`.
 */
export function formatNarrationForDisplay(input: string): string {
  let text = removeLearnerStateClaims(
    input.replace(UNICODE_SPACES, " ").trim(),
  );
  if (!text) return text;

  if (looksLikeLatex(text)) {
    text = latexToBoardText(text);
  }

  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

export function sameNarrationText(a: string, b: string): boolean {
  const normalize = (text: string) =>
    formatNarrationForDisplay(text)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const left = normalize(a);
  return Boolean(left) && left === normalize(b);
}
