/**
 * Shared topic detectors so sketches, heuristics, and routing stay in sync.
 */

export function isIntegralAreaTopic(
  prompt: string,
  conceptKey?: string,
): boolean {
  const blob = `${prompt} ${conceptKey ?? ""}`.toLowerCase();

  if (/\barea under\b/.test(blob) || /\briemann\b/.test(blob)) return true;

  const mentionsIntegral = /\bintegral\b/.test(blob) || /∫/.test(blob);
  if (!mentionsIntegral) return false;

  // "integrate 3x^2" is a computation — leave it to the worked-example path.
  if (
    /\bintegrat(e|ing)\b/.test(blob) &&
    /\d/.test(blob) &&
    !/\barea\b/.test(blob)
  ) {
    return false;
  }

  // Keep indefinite-technique questions on the algebra board unless they
  // explicitly asked for area.
  if (
    /\b(antiderivative|indefinite|u-?sub|integration by parts)\b/.test(blob) &&
    !/\barea\b/.test(blob)
  ) {
    return false;
  }

  return true;
}

/**
 * Limits as x approaches a value — teach on a graph, not as a formula dump.
 * Derivative-as-a-limit stays on the derivative heuristic.
 */
export function isLimitGraphTopic(
  prompt: string,
  conceptKey?: string,
): boolean {
  const blob = `${prompt} ${conceptKey ?? ""}`.toLowerCase();
  if (!blob.trim()) return false;

  if (/\b(speed limit|credit limit|limited|character limit)\b/.test(blob)) {
    return false;
  }

  if (
    /\bderivative\b/.test(blob) &&
    !/\blimits?\s+as\b/.test(blob)
  ) {
    return false;
  }

  if (/\blimits?\b/.test(blob) || /\blim\s*[_({]/.test(blob)) return true;
  if (/\bx\s*(approaches?|goes to|tends to|→|->)\b/.test(blob)) return true;
  if (/x\s*→\s*[a-z0-9]/.test(blob)) return true;
  return false;
}

export function isGraphBoardTopic(
  prompt: string,
  conceptKey?: string,
): boolean {
  return (
    isIntegralAreaTopic(prompt, conceptKey) ||
    isLimitGraphTopic(prompt, conceptKey)
  );
}
