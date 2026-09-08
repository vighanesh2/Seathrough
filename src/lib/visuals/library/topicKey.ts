/**
 * Normalize a user prompt and concept into a stable, lesson-scoped library key.
 * The prompt must remain part of the key: planner concept labels such as
 * "success", "overview", or "definition" are not globally unique topics.
 */
export function makeTopicKey(input: {
  prompt: string;
  conceptKey?: string;
}): string {
  const fromPrompt = stripQuestionLead(input.prompt);

  // "Solve 4x + 8 = 24" and "solve 2x + 5 = 17" are the same concept but not
  // the same lesson — keying them together replays the wrong worked example.
  if (hasConcreteProblem(fromPrompt)) {
    return clampKey(slugify(fromPrompt));
  }

  const concept = cleanFragment(input.conceptKey ?? "");
  if (concept && concept.length >= 3 && !isNoisePhrase(concept)) {
    return clampKey(
      slugify(`${fromPrompt || "topic"} -- ${concept}`),
    );
  }

  return clampKey(slugify(fromPrompt || "topic"));
}

/** An equation or arithmetic the student expects worked on the board. */
export function hasConcreteProblem(prompt: string): boolean {
  const text = prompt.toLowerCase();
  // 4x + 8 = 24, y = mx + b
  if (/[0-9a-z)\]]\s*=\s*[-+(]?\s*[0-9a-z(]/.test(text)) return true;
  // 12 × 7, 3 + 4, 2^8
  if (/\d\s*[+\-×÷*/^]\s*\d/.test(text)) return true;
  // 4x, 2y — a coefficient bound to a single variable
  if (/\d\s?[a-z](?![a-z])/.test(text)) return true;
  return false;
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
