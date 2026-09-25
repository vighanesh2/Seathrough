import {
  INTAKE_QUESTIONS,
  type IntakeAnswerId,
  type IntakeAnswers,
} from "@/lib/experiment/systemDesign/sections";

const MAX_ANSWER = 400;

export function parseIntakeAnswers(
  value: unknown,
): { ok: true; answers: IntakeAnswers } | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Answer the four questions first." };
  }
  const raw = value as Record<string, unknown>;
  const answers = {} as IntakeAnswers;
  for (const question of INTAKE_QUESTIONS) {
    const value = raw[question.id];
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) {
      return { ok: false, error: `Answer: ${question.prompt}` };
    }
    if (text.length > MAX_ANSWER) {
      return {
        ok: false,
        error: `That answer is too long (max ${MAX_ANSWER} characters).`,
      };
    }
    answers[question.id as IntakeAnswerId] = text;
  }
  return { ok: true, answers };
}

export function formatIntakeAnswers(answers: IntakeAnswers): string {
  return INTAKE_QUESTIONS.map(
    (question) => `${question.prompt}\n${answers[question.id]}`,
  ).join("\n\n");
}
