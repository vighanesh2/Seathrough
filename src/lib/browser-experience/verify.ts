import type { PageExtraction } from "@/lib/browser-experience/driver";

const STOP = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "me",
  "my",
  "and",
  "or",
  "in",
  "on",
  "for",
  "with",
  "its",
  "it",
  "is",
  "are",
  "was",
  "be",
  "as",
  "at",
  "by",
  "from",
  "that",
  "this",
  "these",
  "those",
  "what",
  "which",
  "how",
  "why",
  "who",
  "when",
  "where",
  "explain",
  "explaining",
  "show",
  "tell",
  "about",
  "please",
  "help",
  "need",
  "want",
  "look",
  "looking",
  "give",
  "does",
  "do",
  "did",
  "can",
  "could",
  "would",
  "should",
  "into",
  "using",
  "your",
  "our",
  "their",
]);

/** Words that mean the student wants a labeled figure / anatomy walkthrough. */
const DIAGRAM_CUES =
  /\b(diagram|figure|picture|image|labeled|labelled|illustration|drawing|parts?|anatomy|structure|lobes?|components?)\b/i;

export function wantsDiagram(question: string): boolean {
  return DIAGRAM_CUES.test(question);
}

export function topicKeywords(question: string): string[] {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOP.has(w) && !DIAGRAM_CUES.test(w));
  // Keep unique, prefer longer tokens first for matching.
  return [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 10);
}

export type PageVerdict = {
  ok: boolean;
  score: number;
  reasons: string[];
  matchedKeywords: string[];
  matchedAnchors: string[];
};

/**
 * Cross-check a loaded page against the student's question before we teach.
 * Rejects thin pages, off-topic pages, and diagram asks without a figure/labels.
 */
export function verifyPageForQuestion(
  question: string,
  extraction: PageExtraction,
  options?: { excerpt?: string },
): PageVerdict {
  const keywords = topicKeywords(question);
  const diagram = wantsDiagram(question);
  const hay = [
    extraction.title,
    extraction.text,
    extraction.anchors.join(" "),
    options?.excerpt ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const matchedKeywords = keywords.filter((k) => hay.includes(k));
  const matchedAnchors = extraction.anchors.filter((anchor) => {
    const a = anchor.toLowerCase();
    return keywords.some((k) => a.includes(k) || k.includes(a));
  });

  let score = 0;
  const reasons: string[] = [];

  if (extraction.text.length >= 400) score += 15;
  else if (extraction.text.length >= 120) score += 6;
  else {
    reasons.push("Page has too little readable text.");
  }

  const keywordRatio =
    keywords.length === 0 ? 0.5 : matchedKeywords.length / keywords.length;
  score += Math.round(keywordRatio * 40);
  if (matchedKeywords.length === 0 && keywords.length > 0) {
    reasons.push("Page does not mention the topic clearly.");
  } else if (matchedKeywords.length > 0) {
    reasons.push(`Matched topic words: ${matchedKeywords.join(", ")}.`);
  }

  if (matchedAnchors.length > 0) {
    score += Math.min(20, matchedAnchors.length * 6);
    reasons.push(`Found section labels: ${matchedAnchors.slice(0, 4).join(", ")}.`);
  }

  if (diagram) {
    if (extraction.hasLargeFigure) {
      score += 20;
      reasons.push("Found a large diagram/figure.");
    } else {
      score -= 15;
      reasons.push("No clear diagram/figure on the page.");
    }
    // Part walkthroughs need multiple pointable labels.
    if (extraction.anchors.length >= 4) {
      score += 12;
      reasons.push("Page has several pointable section labels.");
    } else if (extraction.anchors.length >= 2) {
      score += 6;
    } else {
      score -= 10;
      reasons.push("Not enough labeled parts to walk through.");
    }
  } else if (extraction.hasLargeFigure) {
    score += 4;
  }

  // Soft reject common junk.
  if (
    /\b(subscribe|enable cookies|access denied|verify you are human)\b/i.test(
      extraction.text.slice(0, 500),
    ) &&
    extraction.text.length < 900
  ) {
    score -= 25;
    reasons.push("Page looks blocked or empty.");
  }

  const ok =
    score >= 55 &&
    matchedKeywords.length >= Math.min(1, keywords.length) &&
    extraction.text.length >= 120 &&
    (!diagram ||
      extraction.hasLargeFigure ||
      matchedAnchors.length >= 2 ||
      extraction.anchors.length >= 4);

  if (ok) reasons.push("Passed cross-check.");
  else if (!reasons.some((r) => /does not|too little|No clear|Not enough|blocked/i.test(r))) {
    reasons.push("Score too low to teach from this page.");
  }

  return {
    ok,
    score,
    reasons,
    matchedKeywords,
    matchedAnchors,
  };
}
