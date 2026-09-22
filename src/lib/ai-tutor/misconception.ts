import { tutorComplete } from "@/lib/ai-tutor/llm";

export const MAX_INPUT_CHARS = 4000;

export const DETECT_SYSTEM = `You detect what a student is actually confused about.

A misconception is a stable wrong model — not a missing fact, not a calculation slip.
Your job is diagnosis, not teaching a full lesson.

Write plain text only. No JSON. No markdown tables. Use these labels, in this order:

Topic: <the concept, or "unclear">
Kind: misconception | knowledge gap | slip | actually correct | not a learning statement
What's confused: <one sentence naming the mix-up, or "none">
Wrong model: <what they seem to believe>
Right model: <the idea they need instead, 1-2 sentences, not a lecture>
Evidence: <short quote or paraphrase of their words>
Confidence: high | medium | low
Probe: <one question that would confirm this, or split two competing mix-ups>

Rules:
- If they asked to learn or explain a topic and did not state a wrong belief, Kind is knowledge gap. What's confused: none. Wrong model: none. Do NOT invent a common misconception.
- Only Kind: misconception when their words clearly show a wrong model.
- If two mix-ups fit, name both under What's confused and make Probe split them.
- If they are right, Kind is actually correct. Do not invent a mix-up.
- If they simply don't know yet, Kind is knowledge gap.
- If the text is not about learning a concept, say so.
- No LaTeX. No secrets. No tutoring script after the probe.
`;

export function validateInput(text: string): string {
  const cleaned = (text || "").trim();
  if (!cleaned) throw new Error("Input is empty. Paste what the student said.");
  if (cleaned.length > MAX_INPUT_CHARS) {
    throw new Error(
      `Input is too long (${cleaned.length} chars). Keep it under ${MAX_INPUT_CHARS}.`,
    );
  }
  return cleaned;
}

export async function detect(
  text: string,
  options: { topic?: string; context?: string } = {},
): Promise<string> {
  const student = validateInput(text);
  const parts: string[] = [];
  if (options.topic?.trim()) parts.push(`Topic hint: ${options.topic.trim()}`);
  if (options.context?.trim()) parts.push(options.context.trim());
  const user = parts.length
    ? `${parts.join("\n\n")}\n\nStudent said:\n${student}`
    : student;
  return tutorComplete(DETECT_SYSTEM, user, {
    maxTokens: 700,
    temperature: 0.2,
  });
}
