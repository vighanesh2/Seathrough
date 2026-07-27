import type { VisualAction } from "@/lib/visuals/types";

/**
 * Metaphor / concept → visual routing table (same repo).
 * Not art — decides WHICH asset or process diagram to show for abstract prompts.
 * Grow by adding rows; do not hardcode topics in the router.
 */
export type MetaphorEntry = {
  id: string;
  /** Phrases matched against the user prompt (case-insensitive) */
  aliases: string[];
  /**
   * Curated template assetId, or omit when using mermaid/rough only.
   */
  assetId?: string;
  renderer?: "template" | "mermaid" | "mafs" | "rough";
  /** Mermaid source when renderer is mermaid */
  mermaidSource?: string;
  /** Never allow these assets for this concept */
  forbiddenAssetIds?: string[];
  defaultActions?: VisualAction[];
  /** Higher wins when multiple aliases hit */
  priority?: number;
  notes?: string;
};

export const METAPHOR_MAP: MetaphorEntry[] = [
  // ── High-risk / abstract (Tier 3) ──────────────────────────────────
  {
    id: "java-class",
    aliases: [
      "java class",
      "class in java",
      "what is a class",
      "oop class",
      "class vs object",
      "public class",
    ],
    assetId: "class-blueprint",
    renderer: "template",
    forbiddenAssetIds: ["classroom-blueprint", "horse-rider", "airplane-side-view"],
    priority: 100,
    defaultActions: [
      { type: "draw" },
      { type: "label", anchor: "blueprint", text: "Class (blueprint)" },
      { type: "label", anchor: "instanceA", text: "Object A" },
      { type: "label", anchor: "instanceB", text: "Object B" },
    ],
    notes: "Class = template/blueprint; NEVER classroom",
  },
  {
    id: "stack-ds",
    aliases: ["stack data structure", "what is a stack", "lifo", "call stack"],
    assetId: "stack-plates",
    renderer: "template",
    priority: 80,
    defaultActions: [
      { type: "draw" },
      { type: "label", anchor: "top", text: "top (push/pop)" },
      { type: "label", anchor: "bottom", text: "bottom" },
    ],
  },
  {
    id: "queue-ds",
    aliases: ["queue data structure", "what is a queue", "fifo"],
    assetId: "queue-line",
    renderer: "template",
    priority: 80,
    defaultActions: [
      { type: "draw" },
      { type: "label", anchor: "front", text: "front (out)" },
      { type: "label", anchor: "rear", text: "rear (in)" },
    ],
  },
  {
    id: "variable",
    aliases: ["what is a variable", "variable in programming", "variables"],
    assetId: "variable-box",
    renderer: "template",
    priority: 70,
    defaultActions: [
      { type: "draw" },
      { type: "label", anchor: "name", text: "name" },
      { type: "label", anchor: "value", text: "value" },
    ],
    notes: "Box metaphor — revisit for references",
  },
  {
    id: "function",
    aliases: ["what is a function", "functions in programming", "pure function"],
    assetId: "function-machine",
    renderer: "template",
    priority: 70,
    defaultActions: [
      { type: "draw" },
      { type: "label", anchor: "input", text: "input" },
      { type: "label", anchor: "output", text: "output" },
    ],
  },
  {
    id: "loop",
    aliases: ["for loop", "while loop", "programming loop", "what is a loop"],
    assetId: "loop-cycle",
    renderer: "template",
    priority: 75,
  },
  {
    id: "binary-bits",
    aliases: ["what is binary", "bits and bytes", "ones and zeros", "binary"],
    assetId: "binary-bits",
    renderer: "template",
    priority: 70,
  },
  {
    id: "oop-inheritance",
    aliases: ["inheritance in oops", "inheritance oop", "extends class", "is-a"],
    assetId: "inheritance-tree",
    renderer: "template",
    priority: 85,
    notes: "is-a hierarchy — not has-a",
  },
  {
    id: "encryption",
    aliases: ["what is encryption", "public key encryption", "encrypt"],
    assetId: "encryption-lock",
    renderer: "template",
    priority: 70,
  },
  {
    id: "api",
    aliases: ["what is an api", "how apis work", "rest api"],
    assetId: "api-waiter",
    renderer: "template",
    priority: 80,
  },
  {
    id: "pointer-reference",
    aliases: ["what is a pointer", "reference vs value", "pointers"],
    assetId: "pointer-arrow",
    renderer: "template",
    priority: 85,
  },
  {
    id: "recursion",
    aliases: ["what is recursion", "recursive function", "recursion"],
    assetId: "tabler-layers",
    renderer: "template",
    priority: 80,
    notes: "Placeholder layers icon until Russian-doll template ships",
  },
  {
    id: "supply-demand",
    aliases: ["supply and demand", "equilibrium price"],
    assetId: "supply-demand-curves",
    renderer: "template",
    priority: 75,
  },
  {
    id: "compound-interest",
    aliases: ["compound interest", "exponential growth money"],
    assetId: "compound-growth",
    renderer: "template",
    priority: 75,
  },

  // ── Tier 1 literals (Tabler-generated) ────────────────────────────
  {
    id: "eye",
    aliases: ["parts of the eye", "eye cross section", "how the eye works", "the eye"],
    assetId: "eye-simple",
    renderer: "template",
    priority: 70,
  },
  {
    id: "tree-parts",
    aliases: ["parts of a tree", "tree roots trunk leaves", "parts of tree"],
    assetId: "tree-simple",
    renderer: "template",
    priority: 70,
  },
  {
    id: "solar-system",
    aliases: ["solar system", "planets in order", "orbit of earth"],
    assetId: "solar-planet",
    renderer: "template",
    priority: 75,
  },
  {
    id: "water-molecule",
    aliases: ["water molecule", "h2o structure", "structure of water", "h2o"],
    assetId: "atom-simple",
    renderer: "template",
    priority: 75,
  },
  {
    id: "rocket-launch",
    aliases: ["rocket launch", "escape velocity", "how rockets work"],
    assetId: "rocket-simple",
    renderer: "template",
    priority: 80,
  },

  // ── Tier 4 math (Tabler + formula overlay via router math path) ───
  {
    id: "sine-unit-circle",
    aliases: ["sine wave", "unit circle sine", "what is sine"],
    assetId: "tabler-wave-sine",
    renderer: "template",
    priority: 80,
  },
  {
    id: "fractions",
    aliases: ["what is a fraction", "fractions pizza", "1/2 and 1/4"],
    assetId: "tabler-pizza",
    renderer: "template",
    priority: 75,
  },
  {
    id: "vectors",
    aliases: ["what is a vector", "vector addition", "tip to tail"],
    assetId: "tabler-vector",
    renderer: "template",
    priority: 75,
  },
  // probability / coin flips → board_script pen lesson (see boardScriptPlan heuristics)
  {
    id: "matrix-multiplication",
    aliases: ["matrix multiplication", "matrices transform space", "matrix"],
    assetId: "tabler-matrix",
    renderer: "template",
    priority: 80,
  },
  {
    id: "standard-deviation",
    aliases: ["standard deviation", "what is std deviation"],
    assetId: "tabler-chart-dots",
    renderer: "template",
    priority: 80,
  },
  {
    id: "prime-numbers",
    aliases: ["prime numbers", "sieve of eratosthenes"],
    assetId: "tabler-list-numbers",
    renderer: "template",
    priority: 80,
  },
  {
    id: "area-circle",
    aliases: ["area of a circle", "pi r squared"],
    assetId: "tabler-circle",
    renderer: "template",
    priority: 75,
  },
  {
    id: "slope-intercept",
    aliases: ["y = mx + b", "slope intercept form", "slope and intercept"],
    assetId: "tabler-math-function",
    renderer: "template",
    priority: 80,
  },
  {
    id: "logarithms",
    aliases: ["what is a logarithm", "log base 10", "logarithms"],
    assetId: "tabler-log-ratio",
    renderer: "template",
    priority: 70,
  },
  // derivative meaning → board_script pen lesson (see boardScriptPlan heuristics)
  // Do not map bare "derivative" to the generic function icon.

  // ── Process (Tier 2) — prefer mermaid shells ──────────────────────
  {
    id: "photosynthesis",
    aliases: ["photosynthesis"],
    renderer: "mermaid",
    priority: 90,
    mermaidSource: [
      "flowchart TD",
      "  S[Sunlight] --> L[Leaf]",
      "  W[Water] --> L",
      "  C[CO2] --> L",
      "  L --> G[Glucose]",
      "  L --> O[Oxygen]",
    ].join("\n"),
  },
  {
    id: "water-cycle",
    aliases: ["water cycle", "hydrologic cycle"],
    renderer: "mermaid",
    priority: 90,
    mermaidSource: [
      "flowchart TD",
      "  E[Evaporation] --> C[Condensation]",
      "  C --> P[Precipitation]",
      "  P --> R[Collection]",
      "  R --> E",
    ].join("\n"),
  },
  {
    id: "bill-becomes-law",
    aliases: ["bill becomes a law", "how a bill becomes law", "legislative process"],
    renderer: "mermaid",
    priority: 90,
    mermaidSource: [
      "flowchart TD",
      "  D[Draft bill] --> C[Committee]",
      "  C --> H[House vote]",
      "  H --> S[Senate vote]",
      "  S --> P[President]",
      "  P --> L[Law]",
    ].join("\n"),
  },
  {
    id: "rock-cycle",
    aliases: ["rock cycle"],
    renderer: "mermaid",
    priority: 90,
    mermaidSource: [
      "flowchart TD",
      "  I[Igneous] --> S[Sedimentary]",
      "  S --> M[Metamorphic]",
      "  M --> I",
    ].join("\n"),
  },
  {
    id: "digestion",
    aliases: ["digestion process", "digestive system", "digestion"],
    renderer: "mermaid",
    priority: 85,
    mermaidSource: [
      "flowchart TD",
      "  M[Mouth] --> S[Stomach]",
      "  S --> I[Intestines]",
      "  I --> N[Nutrients absorbed]",
    ].join("\n"),
  },
];

export type MetaphorMatch = {
  entry: MetaphorEntry;
  score: number;
};

/** Best metaphor-map hit for a user prompt (aliases only — never narration). */
export function matchMetaphor(prompt: string): MetaphorMatch | undefined {
  const t = prompt.toLowerCase().trim();
  if (!t) return undefined;

  let best: MetaphorMatch | undefined;

  for (const entry of METAPHOR_MAP) {
    let hit = 0;
    for (const alias of entry.aliases) {
      const a = alias.toLowerCase();
      if (t.includes(a)) {
        hit = Math.max(hit, a.length + (entry.priority ?? 0));
      }
    }
    // Light single-token fallback for strong ids
    if (!hit && entry.aliases.some((a) => a.split(" ").length === 1 && wordHas(t, a))) {
      hit = 6 + (entry.priority ?? 0);
    }
    if (hit > 0 && (!best || hit > best.score)) {
      best = { entry, score: hit };
    }
  }

  return best;
}

function wordHas(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(text);
}
