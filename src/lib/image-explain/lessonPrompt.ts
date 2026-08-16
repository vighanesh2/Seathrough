import type { ImageExtraction } from "@/lib/image-explain/types";
import { latexToBoardText } from "@/lib/math/latexToBoardText";

/**
 * Turn screenshot extraction into a lesson prompt the whiteboard stream understands.
 */
export function buildLessonPromptFromScreenshot(input: {
  extraction: ImageExtraction;
  question?: string;
}): string {
  const focus = input.question?.trim();
  const raw = input.extraction.text.trim();
  const boardFriendly = latexToBoardText(raw);

  const lines = [
    "A student uploaded a screenshot of this problem. Teach it on the whiteboard like a tutor with a pen.",
    "Transcribe the problem clearly, show step-by-step work, and give the final answer.",
    "If it is multiple choice, state the correct option and why the others are wrong.",
    "CRITICAL board writing rules:",
    "- On the whiteboard (write steps), use plain readable math: (1/2)x + (3/2)(x+1) - 1/4 = 5",
    "- NEVER write LaTeX commands on the board (no \\frac, no $, no \\times). Use 1/2, ×, ÷ instead.",
    "- Put one clean KaTeX string in the visual formula field for the original equation if helpful.",
    "- Write each transform as its own equation line connected by short arrows (then / so).",
    focus ? `Student focus: ${focus}` : null,
    `Detected type: ${input.extraction.kind}`,
    "Problem text (use this — already readable for the board):",
    boardFriendly,
    boardFriendly !== raw
      ? `Original transcription (may include LaTeX — do not copy LaTeX onto the board):\n${raw}`
      : null,
  ].filter(Boolean);

  return lines.join("\n\n");
}
