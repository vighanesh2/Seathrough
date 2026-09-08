const UNSIGNED_AREA_CLAIMS: Array<[RegExp, string]> = [
  [
    /\ban integral measures the area under a curve\b/gi,
    "a definite integral measures signed area between a curve and the x-axis",
  ],
  [/\btotal shaded area\b/gi, "signed area"],
  [/\btotal area\b/gi, "signed area"],
  [/\btrue area\b/gi, "signed-area sum"],
  [/\bthat area\b/gi, "that signed area"],
];

export const SIGNED_AREA_RULE =
  "Area above the x-axis adds; area below the x-axis subtracts.";

/** Correct common fluent-but-wrong integral-as-area claims in final narration. */
export function correctIntegralAreaClaims(input: string): string {
  let output = input;
  for (const [pattern, replacement] of UNSIGNED_AREA_CLAIMS) {
    output = output.replace(pattern, replacement);
  }
  return output
    .replace(/^a definite integral\b/, "A definite integral")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasSignedAreaSemantics(input: string): boolean {
  const normalized = input.toLowerCase();
  const saysSigned = /\bsigned[- ]area\b/.test(normalized);
  const handlesBelowAxis =
    /\bbelow (?:the )?x-axis\b.*\b(subtracts?|negative)\b/.test(normalized) ||
    /\b(subtracts?|negative)\b.*\bbelow (?:the )?x-axis\b/.test(normalized);
  return saysSigned && handlesBelowAxis;
}

/**
 * Keep the recap and Next action, while guaranteeing the signed-area invariant.
 */
export function ensureSignedAreaSummary(input: string): string {
  const corrected = correctIntegralAreaClaims(input);
  if (hasSignedAreaSemantics(corrected)) return corrected;

  const nextMatch = corrected.match(/\bNext\s*:/i);
  if (nextMatch?.index == null) {
    return `${corrected} ${SIGNED_AREA_RULE}`.trim();
  }

  const beforeNext = corrected.slice(0, nextMatch.index).trim();
  const next = corrected.slice(nextMatch.index).trim();
  return `${beforeNext} ${SIGNED_AREA_RULE} ${next}`.trim();
}
