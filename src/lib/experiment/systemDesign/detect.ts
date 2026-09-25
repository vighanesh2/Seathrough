const NOT_SOFTWARE =
  /\b(design|draw|sketch)\s+(a|an|the)?\s*(function|method|class|algorithm|triangle|circle|square|heart|cell|plant|volcano|atom|kidney|eye)\b/i;

const EXPLICIT =
  /\b(system\s+design|design\s+the\s+(backend|system|architecture)|architecture\s+of|how\s+would\s+you\s+(design|architect))\b/i;

const DESIGN_VERB = /\b(design|architect)\b/i;

const SOFTWARE_TARGET =
  /\b(backend|system|architecture|service|microservice|app|application|platform|api|chat|feed|shortener|clone|saas)\b/i;

/**
 * True only for a software system-design ask.
 * Math, biology, and “design a function” stay on the normal tutor path.
 */
export function isSoftwareSystemDesign(prompt: string): boolean {
  const text = prompt.replace(/\s+/g, " ").trim();
  if (!text || text.length > 800) return false;
  if (NOT_SOFTWARE.test(text) && !/\bsystem\s+design\b/i.test(text)) {
    return false;
  }
  if (EXPLICIT.test(text)) return true;
  return DESIGN_VERB.test(text) && SOFTWARE_TARGET.test(text);
}

export type DrawBranch = "lesson" | "intake" | "design";

export function drawBranch(
  prompt: string,
  hasAnswers: boolean,
): DrawBranch {
  if (!isSoftwareSystemDesign(prompt)) return "lesson";
  return hasAnswers ? "design" : "intake";
}
