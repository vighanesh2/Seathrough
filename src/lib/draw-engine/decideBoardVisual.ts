import { isGraphBoardTopic } from "@/lib/visuals/library/topicMatch";

export type BoardVisualStrategy =
  | "uml"
  | "board_script"
  | "sketch"
  | "narration";

/**
 * Decide what the board should show for this lesson.
 * Never returns "nothing" — every path produces meaningful content.
 * (ChatGPT board image generation has been removed.)
 */
export function decideBoardVisualStrategy(input: {
  prompt: string;
  hasUmlPlan?: boolean;
  hasBoardScript?: boolean;
}): BoardVisualStrategy {
  const prompt = input.prompt.trim();
  const p = prompt.toLowerCase();

  if (input.hasUmlPlan) {
    return "uml";
  }

  // Local sketches (curve + shaded area, Big Bang, …) beat generic math text.
  if (hasLocalSketch(p)) {
    return "sketch";
  }

  // Math / formula lessons → pen board script.
  if (isMathHeavy(p)) {
    return input.hasBoardScript ? "board_script" : "narration";
  }

  if (input.hasBoardScript) {
    return "board_script";
  }

  // Always fall through to writing the tutor’s sentences on the board.
  return "narration";
}

function isMathHeavy(p: string): boolean {
  return (
    /\b(equation|algebra|calculus|derivative|integral|fraction|quadratic|polynomial|matrix|geometry|theorem|pythagoras|trigonometry|sine|cosine|limit)\b/.test(
      p,
    ) ||
    /[=∫∑√π]/.test(p) ||
    /\b\d+\s*[+\-×x*/÷]\s*\d+\b/.test(p)
  );
}

function hasLocalSketch(p: string): boolean {
  return (
    /\bbig\s*bang\b|\bphotosynthesis\b|\bwater\s+cycle\b|\bsingularit/.test(
      p,
    ) || isGraphBoardTopic(p)
  );
}
