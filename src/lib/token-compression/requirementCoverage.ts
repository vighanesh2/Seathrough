import { normalizePaneText } from "@/lib/token-compression/responseHarness";

export type RequirementEvidence = {
  requirement: string;
  evidence: string;
};

export type RequirementCoverageCheck = {
  ok: boolean;
  requiredEvidence: number;
  validEvidence: number;
  reason: string | null;
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

function parseSmallNumber(value: string): number | null {
  const normalized = value.toLowerCase();
  const numeric = Number.parseInt(normalized, 10);
  if (Number.isInteger(numeric) && numeric > 0 && numeric <= 6) {
    return numeric;
  }
  return NUMBER_WORDS[normalized] ?? null;
}

/**
 * Conservative lower bound for explicit deliverables in a tight ask.
 * This is intentionally lexical: the LLM authors evidence, while this check
 * prevents it from silently declaring a multi-item request complete with one row.
 */
export function requiredEvidenceCount(tightAsk: string): number {
  const ask = normalizePaneText(tightAsk);
  if (!ask) return 0;

  if (/\b(?:for each|each of|one per)\b/.test(ask)) {
    if (/\b(?:triad|three|3)\b/.test(ask)) return 3;
    if (/\b(?:quartet|four|4)\b/.test(ask)) return 4;
    if (/\b(?:pair|both|two|2)\b/.test(ask)) return 2;
    // “Each” necessarily names more than one required item.
    return 2;
  }

  const countedDeliverable = ask.match(
    /\b(one|two|three|four|five|six|[1-6])\s+(?:real world\s+)?(?:examples?|reasons?|steps?|cases?|differences?|controls?|applications?)\b/,
  );
  if (countedDeliverable) {
    return parseSmallNumber(countedDeliverable[1]!) ?? 1;
  }

  if (/\b(?:both|compare|contrast)\b/.test(ask)) return 2;
  if (
    /\b(?:include|including|show|give|provide|using|must cover|focus on)\b/.test(
      ask,
    )
  ) {
    return 1;
  }

  return 0;
}

export function checkRequirementCoverage(
  tightAsk: string,
  paneScript: string,
  evidence: readonly RequirementEvidence[],
): RequirementCoverageCheck {
  const requiredEvidence = requiredEvidenceCount(tightAsk);
  if (requiredEvidence === 0) {
    return {
      ok: true,
      requiredEvidence,
      validEvidence: 0,
      reason: null,
    };
  }

  const pane = normalizePaneText(paneScript);
  const distinct = new Set<string>();
  for (const row of evidence) {
    const requirement = normalizePaneText(row.requirement);
    const quote = normalizePaneText(row.evidence);
    if (requirement.length < 3 || quote.length < 8) continue;
    if (!pane.includes(quote)) continue;
    distinct.add(quote);
  }

  const validEvidence = distinct.size;
  const ok = validEvidence >= requiredEvidence;
  return {
    ok,
    requiredEvidence,
    validEvidence,
    reason: ok
      ? null
      : `expected at least ${requiredEvidence} distinct requirement evidence row(s), found ${validEvidence}`,
  };
}
