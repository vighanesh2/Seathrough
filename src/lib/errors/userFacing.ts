/**
 * Map provider/infra errors to calm copy for learners.
 * Never surface raw Groq/OpenAI/Deepgram quota text in the UI.
 */
export const BUSY_USER_MESSAGE =
  "Our app is facing a lot of users right now — we're working on fixing the issues. Please try again in a few minutes.";

const GENERIC_USER_MESSAGE =
  "Something went wrong while starting the lesson. Please try again in a moment.";

export function toUserFacingError(
  error: unknown,
  fallback = GENERIC_USER_MESSAGE,
): string {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";

  if (!raw.trim()) return fallback;

  if (isCapacityOrRateLimitError(raw)) {
    return BUSY_USER_MESSAGE;
  }

  // Known safe / intentional product messages — keep as-is
  if (
    /^(Prompt is required|Description is required|Description is too long|Conversation not found|Lesson stream returned an empty body|Add OPENAI_API_KEY|Enter a topic|Crash details are required|Sign in required|Prompt is too long|The scene planner|The scene agent|Couldn't get a stable 3D scene|Voice is not configured|Nothing to speak)/i.test(
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
    return fallback;
  }

  // Hide HTTP / stack-ish dumps
  if (/\b(429|500|502|503|ECONN|ETIMEDOUT|fetch failed)\b/i.test(raw)) {
    if (/\b429\b|rate limit|quota|capacity/i.test(raw)) {
      return BUSY_USER_MESSAGE;
    }
    return fallback;
  }

  // If it looks like an internal dump, sanitize
  if (raw.length > 180 || /at\s+\S+\s+\(/.test(raw) || /stack/i.test(raw)) {
    return fallback;
  }

  return raw;
}

export function isCapacityOrRateLimitError(message: string): boolean {
  return /\b(429|rate limit|rate_limit|tokens? per day|TPD|TPM|RPM|quota|too many requests|capacity|overloaded|resource_exhausted)\b/i.test(
    message,
  );
}
