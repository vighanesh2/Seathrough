/**
 * Decide whether a prompt should stay on the current page (follow-up)
 * or trigger a fresh Google search + new source.
 */
export function isFollowUpPrompt(
  prompt: string,
  options?: { hasReadySession?: boolean; priorQuestion?: string },
): boolean {
  if (!options?.hasReadySession) return false;
  const text = prompt.replace(/\s+/g, " ").trim();
  if (!text) return false;

  const lower = text.toLowerCase();
  const prior = (options.priorQuestion || "").toLowerCase().trim();

  // Brand-new topic phrasing → always re-search.
  if (
    /^(explain|what are|what is|what's|how does|how do|tell me about|show me|parts of|describe)\b/i.test(
      lower,
    ) &&
    text.length > 18
  ) {
    // Unless it clearly refers to the current page.
    if (!/\b(this|that|these|those|here|above|on (the|this) page)\b/i.test(lower)) {
      // If prior question exists and shares almost no content words, re-search.
      if (prior && topicalOverlap(prior, lower) < 0.25) return false;
      if (!prior) return false;
      // Same style of "explain X" but different X
      if (topicalOverlap(prior, lower) < 0.35) return false;
    }
  }

  // Explicit follow-up cues.
  if (
    /^(why|how come|what about|and |also |ok,? |okay,? |then |so |but |explain (that|this|more)|can you|could you|tell me more|what does|where is|which |is that|are those|go deeper|more detail)/i.test(
      lower,
    )
  ) {
    return true;
  }

  // Short pronoun-heavy clarifications.
  if (
    text.length <= 90 &&
    /\b(this|that|these|those|it|they|them|here)\b/i.test(lower)
  ) {
    return true;
  }

  // Default for a ready session with a short note: treat as follow-up.
  if (text.length <= 48) return true;

  // Longer prompts without page reference → new search.
  return false;
}

function topicalOverlap(a: string, b: string): number {
  const stop = new Set([
    "the",
    "a",
    "an",
    "of",
    "to",
    "me",
    "my",
    "what",
    "are",
    "is",
    "how",
    "does",
    "do",
    "explain",
    "part",
    "parts",
    "about",
    "please",
    "tell",
    "show",
  ]);
  const words = (value: string) =>
    new Set(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stop.has(w)),
    );
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return 0;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared += 1;
  return shared / Math.max(wa.size, wb.size);
}
