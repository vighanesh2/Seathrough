import type { SceneRecipe } from "@/lib/schemas/sceneRecipe";

export type MetaphorSeed = {
  /** Matched against concept keys / prompt blob */
  patterns: RegExp[];
  /** Prefer metaphor only when these do NOT match (keeps geometry literal) */
  exclude?: RegExp[];
  build: (label: string) => SceneRecipe;
  key: string;
};

/**
 * In-code pedagogy map: abstract concept → teaching metaphor sketch.
 * Grow this list over time; no external repo required for v1.
 */
export const METAPHOR_SEEDS: MetaphorSeed[] = [
  {
    key: "class-blueprint",
    patterns: [
      /\b(java|python|typescript|c\+\+|csharp|c#)?\s*classes?\b/,
      /\b(public\s+class|class\s+keyword|oop|object[- ]oriented|blueprint)\b/,
    ],
    exclude: [
      /\b(hexagon|pentagon|octagon|triangle|circle|square|polygon|geometry|classroom)\b/,
    ],
    build: (label) => ({
      kind: "concept",
      label: shorten(label, "class"),
      note: "blueprint → instances",
    }),
  },
  {
    key: "cycle",
    patterns: [
      /\b(for-?loop|while-?loop|loops?|iteration|iterate|conveyor)\b/,
    ],
    build: (label) => ({
      kind: "cycle",
      label: shorten(label, "loop"),
    }),
  },
  {
    key: "stack",
    patterns: [/\b(call\s*stack|stacks?|lifo|plates)\b/],
    build: (label) => ({
      kind: "stack",
      label: shorten(label, "stack"),
      layers: ["main", "foo", "bar"],
    }),
  },
  {
    key: "tree",
    patterns: [/\b(binary\s*tree|trees?|bst|heap\s*tree)\b/],
    exclude: [/\b(christmas|palm)\b/],
    build: (label) => ({
      kind: "tree",
      label: shorten(label, "tree"),
    }),
  },
];

export function matchMetaphorSeed(
  text: string,
  label: string,
): { key: string; recipe: SceneRecipe } | undefined {
  const t = text.toLowerCase();
  for (const seed of METAPHOR_SEEDS) {
    if (seed.exclude?.some((re) => re.test(t))) continue;
    if (seed.patterns.some((re) => re.test(t))) {
      return { key: seed.key, recipe: seed.build(label) };
    }
  }
  return undefined;
}

function shorten(label: string, fallback: string): string {
  const cleaned = label.trim() || fallback;
  return cleaned.length > 28 ? `${cleaned.slice(0, 25)}…` : cleaned;
}
