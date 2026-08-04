/**
 * Normalize a user prompt / concept into a stable library key.
 * Same topic asked two ways should usually hit the same row.
 */
export function makeTopicKey(input: {
  prompt: string;
  conceptKey?: string;
}): string {
  const concept = cleanFragment(input.conceptKey ?? "");
  if (concept && concept.length >= 3 && !isNoisePhrase(concept)) {
    return clampKey(slugify(concept));
  }

  const fromPrompt = stripQuestionLead(input.prompt);
  return clampKey(slugify(fromPrompt || "topic"));
}

export function displayLabelFromKey(topicKey: string): string {
  return topicKey
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 60);
}

function stripQuestionLead(prompt: string): string {
  return prompt
    .trim()
    .replace(
      /^(please\s+)?(can you\s+)?(could you\s+)?(explain|what is|what's|whats|define|teach me|how does|how do|why does|why do|show me)\s+/i,
      "",
    )
    .replace(/\?+$/g, "")
    .trim();
}

function cleanFragment(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isNoisePhrase(value: string): boolean {
  return /^(idea|topic|concept|thing|this|that|it)$/i.test(value);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function clampKey(key: string): string {
  const trimmed = key.slice(0, 80).replace(/-+$/g, "");
  return trimmed || "topic";
}
