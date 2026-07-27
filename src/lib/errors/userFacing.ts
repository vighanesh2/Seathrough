/**
 * Map provider/infra errors to calm copy for learners.
 * Never surface raw Groq/OpenAI/Deepgram quota text in the UI.
 */
export const BUSY_USER_MESSAGE =
  "Our app is facing a lot of users right now — we're working on fixing the issues. Please try again in a few minutes.";

const GENERIC_USER_MESSAGE =
  "Something went wrong while starting the lesson. Please try again in a moment.";

export function toUserFacingError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";

  if (!raw.trim()) return GENERIC_USER_MESSAGE;

  if (isCapacityOrRateLimitError(raw)) {
    return BUSY_USER_MESSAGE;
  }

  // Known safe / intentional product messages — keep as-is
  if (
    /^(Prompt is required|Conversation not found|Lesson stream returned an empty body)/i.test(
      raw,
    )
  ) {
    return raw;
  }

  // Hide provider / org / model / billing leakage
  if (
    /\b(groq|openai|deepgram|anthropic|org_[a-z0-9]+|llama-|gpt-|console\.|api key|billing|tokens? per day|TPD|TPM|RPM)\b/i.test(
      raw,
    )
  ) {
    return GENERIC_USER_MESSAGE;
  }

  // Hide HTTP / stack-ish dumps
  if (/\b(429|500|502|503|ECONN|ETIMEDOUT|fetch failed)\b/i.test(raw)) {
    if (/\b429\b|rate limit|quota|capacity/i.test(raw)) {
      return BUSY_USER_MESSAGE;
    }
    return GENERIC_USER_MESSAGE;
  }

  // If it looks like an internal dump, sanitize
  if (raw.length > 180 || /at\s+\S+\s+\(/.test(raw) || /stack/i.test(raw)) {
    return GENERIC_USER_MESSAGE;
  }

  return raw;
}

export function isCapacityOrRateLimitError(message: string): boolean {
  return /\b(429|rate limit|rate_limit|tokens? per day|TPD|TPM|RPM|quota|too many requests|capacity|overloaded|resource_exhausted)\b/i.test(
    message,
  );
}
