import { matchMetaphorSeed } from "@/lib/diagrams/metaphorSeeds";
import { normalizeMetaphorKey } from "@/lib/diagrams/normalizeMetaphor";
import {
  polygonName,
  type SceneRecipe,
} from "@/lib/schemas/sceneRecipe";
import type { SceneShape } from "@/lib/schemas/lesson";

export type BuildSceneInput = {
  prompt?: string;
  title?: string;
  label?: string;
  conceptKey?: string;
  highlight?: string;
  metaphorKey?: string;
  sceneShape?: SceneShape | null;
  /** Optional recipe from the lesson planner (trusted if valid) */
  sceneRecipe?: SceneRecipe;
};

const POLY_SIDES: Record<string, number> = {
  triangle: 3,
  triangular: 3,
  square: 4,
  rectangle: 4,
  rect: 4,
  pentagon: 5,
  pentagonal: 5,
  hexagon: 6,
  hexagonal: 6,
  heptagon: 7,
  octagon: 8,
  octagonal: 8,
  nonagon: 9,
  decagon: 10,
};

/**
 * Literal drawable thing → draw it.
 * Abstract concept → metaphor seed.
 * Always returns a recipe the Rough.js renderer can paint.
 */
export function buildSceneRecipe(input: BuildSceneInput): {
  recipe: SceneRecipe;
  metaphorKey: string;
  label: string;
  shape: SceneShape;
} {
  const label = pickLabel(input);

  if (input.sceneRecipe) {
    const recipe = withLabel(input.sceneRecipe, label);
    return finalize(recipe, input.metaphorKey);
  }

  const blob = [
    input.conceptKey,
    input.highlight,
    input.metaphorKey,
    input.sceneShape && input.sceneShape !== "blank" ? input.sceneShape : "",
    input.label,
    input.title,
    input.prompt,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // 1) Literal geometry / n-gons first (hexagon → hexagon, not metaphor)
  const literal = inferLiteralRecipe(blob, label);
  if (literal) return finalize(literal, input.metaphorKey);

  // 2) Abstract → metaphor seeds (class → classroom)
  const metaphor = matchMetaphorSeed(blob, label);
  if (metaphor) return finalize(metaphor.recipe, metaphor.key);

  // 3) Legacy sceneShape from planner
  const fromShape = recipeFromSceneShape(input.sceneShape, label);
  if (fromShape) return finalize(fromShape, input.metaphorKey);

  // 4) Labeled concept card — never empty stage
  return finalize(
    {
      kind: "concept",
      label,
      note: "sketch of the idea",
    },
    input.metaphorKey,
  );
}

function inferLiteralRecipe(text: string, label: string): SceneRecipe | undefined {
  for (const [name, sides] of Object.entries(POLY_SIDES)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(text)) {
      if (sides === 3) {
        return {
          kind: "polygon",
          sides: 3,
          label: label || "triangle",
          note: "three sides · three angles",
        };
      }
      if (sides === 4 && /\b(square|rectangle|rect)\b/.test(text)) {
        return {
          kind: "polygon",
          sides: 4,
          label: label || (/\brectangle\b/.test(text) ? "rectangle" : "square"),
          note: "four sides",
        };
      }
      if (sides >= 5) {
        return {
          kind: "polygon",
          sides,
          label: label || polygonName(sides),
          note: `${sides} sides`,
        };
      }
    }
  }

  // "6-sided" / "six sided polygon"
  const sided = text.match(
    /\b(\d+|three|four|five|six|seven|eight|nine|ten)[-\s]?sided\b/,
  );
  if (sided) {
    const sides = parseSideWord(sided[1]);
    if (sides && sides >= 3 && sides <= 12) {
      return {
        kind: "polygon",
        sides,
        label: label || polygonName(sides),
        note: `${sides} sides`,
      };
    }
  }

  if (/\b(circle|circular|round|radius|diameter|circumference)\b/.test(text)) {
    return {
      kind: "circle",
      label: label || "circle",
      showRadius: true,
    };
  }

  if (
    /\b(line segment|straight line)\b/.test(text) ||
    (/\bline\b/.test(text) && !/\b(online|pipeline|timeline|linear)\b/.test(text))
  ) {
    return { kind: "line", label: label || "line" };
  }

  return undefined;
}

function recipeFromSceneShape(
  shape: SceneShape | null | undefined,
  label: string,
): SceneRecipe | undefined {
  if (!shape || shape === "blank" || shape === "custom") return undefined;
  switch (shape) {
    case "circle":
      return { kind: "circle", label, showRadius: true };
    case "square":
      return { kind: "polygon", sides: 4, label, note: "four equal sides" };
    case "triangle":
      return { kind: "polygon", sides: 3, label, note: "three sides" };
    case "line":
      return { kind: "line", label };
    case "stack":
      return { kind: "stack", label, layers: ["main", "foo", "bar"] };
    case "cycle":
      return { kind: "cycle", label };
    case "tree":
      return { kind: "tree", label };
    case "classroom":
      return { kind: "metaphor", template: "classroom", label };
    default:
      return undefined;
  }
}

function finalize(
  recipe: SceneRecipe,
  metaphorKeyHint?: string,
): {
  recipe: SceneRecipe;
  metaphorKey: string;
  label: string;
  shape: SceneShape;
} {
  const label = recipeLabel(recipe);
  const metaphorKey =
    normalizeMetaphorKey(metaphorKeyHint) ??
    normalizeMetaphorKey(label) ??
    recipeKey(recipe);
  return {
    recipe,
    metaphorKey,
    label,
    shape: shapeFromRecipe(recipe),
  };
}

function withLabel(recipe: SceneRecipe, label: string): SceneRecipe {
  if ("label" in recipe && (!recipe.label || recipe.label === "concept")) {
    return { ...recipe, label };
  }
  return recipe;
}

function recipeLabel(recipe: SceneRecipe): string {
  return recipe.label;
}

function recipeKey(recipe: SceneRecipe): string {
  if (recipe.kind === "polygon") return polygonName(recipe.sides);
  if (recipe.kind === "metaphor") return recipe.template;
  return recipe.kind;
}

function shapeFromRecipe(recipe: SceneRecipe): SceneShape {
  switch (recipe.kind) {
    case "circle":
      return "circle";
    case "line":
      return "line";
    case "stack":
      return "stack";
    case "cycle":
      return "cycle";
    case "tree":
      return "tree";
    case "metaphor":
      return recipe.template === "classroom" ? "classroom" : "cycle";
    case "polygon":
      if (recipe.sides === 3) return "triangle";
      if (recipe.sides === 4) return "square";
      return "custom";
    case "concept":
    default:
      return "custom";
  }
}

function pickLabel(input: BuildSceneInput): string {
  const raw =
    input.label ||
    input.highlight ||
    input.conceptKey ||
    extractFromPrompt(input.prompt) ||
    input.title ||
    "concept";
  const cleaned = raw.trim();
  return cleaned.length > 40 ? `${cleaned.slice(0, 37)}…` : cleaned;
}

function extractFromPrompt(prompt?: string): string | undefined {
  if (!prompt?.trim()) return undefined;
  return prompt
    .trim()
    .replace(
      /^(what is|what's|explain|tell me about|define|how does|how do|please teach me)\s+/i,
      "",
    )
    .replace(/\bplease teach me\b/i, "")
    .replace(/\?+$/, "")
    .trim();
}

function parseSideWord(word: string): number | undefined {
  const map: Record<string, number> = {
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  if (/^\d+$/.test(word)) return Number(word);
  return map[word.toLowerCase()];
}
