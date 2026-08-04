/**
 * Starter visual curriculum — topic backlog for the asset + metaphor pipeline.
 * Source of truth for what we build next; not a hardcoded runtime allowlist.
 *
 * Status meanings:
 * - planned: not yet in catalog / metaphor map
 * - seeded: partial support exists (may need rewrite)
 * - ready: catalog asset + tags + default actions validated
 */

export type TopicTier = 1 | 2 | 3 | 4;

export type VisualKind =
  | "literal"
  | "process"
  | "metaphor"
  | "math";

export type TopicStatus = "planned" | "seeded" | "ready";

export type CurriculumTopic = {
  id: string;
  tier: TopicTier;
  kind: VisualKind;
  title: string;
  /** Example learner prompts that should route here */
  prompts: string[];
  /** What the visual must prove / teach */
  builds: string;
  /**
   * Preferred visual direction. For metaphors this is the approved scene,
   * not whatever the LLM invents.
   */
  preferredVisual: string;
  /** Explicit anti-patterns — never route to these */
  forbiddenVisuals?: string[];
  /** High metaphor-risk — needs human review before shipping */
  metaphorRisk?: boolean;
  /** Notes / open decisions */
  notes?: string;
  status: TopicStatus;
  /** Existing catalog assetId if any */
  assetId?: string;
};

export const CURRICULUM_BUILDS_BY_TIER: Record<TopicTier, string> = {
  1: "Labeling system, part-by-part reveal, art quality bar",
  2: "Staged reveals, input→output arrows, loops; timeline sync",
  3: "Scene-metaphor library + human-review discipline",
  4: "Formula + geometry + motion together",
};

/**
 * Tiered starter pack from product planning.
 * Grow via data (assets + metaphors), do not hardcode each prompt in the router.
 */
export const STARTER_TOPICS: CurriculumTopic[] = [
  // ── Tier 1 — Literal ──────────────────────────────────────────────
  {
    id: "horse",
    tier: 1,
    kind: "literal",
    title: "Horse",
    prompts: ["horse anatomy", "parts of a horse", "horseriding"],
    builds: "Anatomy labeling, part-highlighting",
    preferredVisual: "Horse side/figure with part anchors",
    status: "seeded",
    assetId: "horse-rider",
    notes: "Seed exists as horse-rider; may split riding vs anatomy later",
  },
  {
    id: "heart",
    tier: 1,
    kind: "literal",
    title: "Heart",
    prompts: ["human heart", "parts of the heart", "how the heart pumps blood"],
    builds: "Labeling + animated flow (blood pumping)",
    preferredVisual: "Heart organ with chamber/vessel anchors + flow arrows",
    status: "seeded",
    assetId: "heart-simple",
    notes: "Seed is a simple heart outline; upgrade for chambers + flow",
  },
  {
    id: "hexagon",
    tier: 1,
    kind: "literal",
    title: "Hexagon",
    prompts: ["what is a hexagon", "hexagon sides and angles"],
    builds: "Pure geometry — sides/angles reveal",
    preferredVisual: "Regular hexagon with side/angle anchors",
    status: "seeded",
    assetId: "hexagon-shape",
  },
  {
    id: "water-molecule",
    tier: 1,
    kind: "literal",
    title: "Water molecule (H₂O)",
    prompts: ["water molecule", "H2O structure", "structure of water"],
    builds: "Simple structure + bond arrows",
    preferredVisual: "H–O–H ball-and-stick with bond anchors",
    status: "seeded",
    assetId: "atom-simple",
  },
  {
    id: "solar-system",
    tier: 1,
    kind: "literal",
    title: "Solar system",
    prompts: ["solar system", "planets in order", "orbit of earth"],
    builds: "Scale, orbit animation, ordering",
    preferredVisual: "Sun + ordered orbits (schematic, not to scale noted)",
    status: "seeded",
    assetId: "solar-planet",
  },
  {
    id: "eye",
    tier: 1,
    kind: "literal",
    title: "The eye",
    prompts: ["parts of the eye", "eye cross section", "how the eye works"],
    builds: "Cross-section + labeled parts",
    preferredVisual: "Eye cross-section with cornea/lens/retina anchors",
    status: "seeded",
    assetId: "eye-simple",
  },
  {
    id: "tree-parts",
    tier: 1,
    kind: "literal",
    title: "A tree (parts of)",
    prompts: ["parts of a tree", "tree roots trunk leaves"],
    builds: "Roots / trunk / leaves labeling",
    preferredVisual: "Tree with roots, trunk, canopy anchors",
    status: "seeded",
    assetId: "tree-simple",
  },

  // ── Tier 2 — Process / sequence ───────────────────────────────────
  {
    id: "photosynthesis",
    tier: 2,
    kind: "process",
    title: "Photosynthesis",
    prompts: [
      "photosynthesis",
      "photosynthesis process",
      "photosynthesis flowchart",
    ],
    builds: "Inputs → transformation → outputs, staged",
    preferredVisual: "Staged process diagram (Mermaid or plant + IO arrows)",
    status: "seeded",
    notes: "Flowchart path already partially handled when user asks for flow",
  },
  {
    id: "water-cycle",
    tier: 2,
    kind: "process",
    title: "Water cycle",
    prompts: ["water cycle", "water cycle diagram", "evaporation condensation"],
    builds: "Loop; cyclical animation",
    preferredVisual: "Closed loop: evaporation → condensation → precipitation → collection",
    status: "seeded",
  },
  {
    id: "bill-becomes-law",
    tier: 2,
    kind: "process",
    title: "How a bill becomes law",
    prompts: ["how a bill becomes a law", "legislative process"],
    builds: "Linear step flow",
    preferredVisual: "Linear staged flowchart (draft → committee → votes → law)",
    status: "seeded",
  },
  {
    id: "digestion",
    tier: 2,
    kind: "process",
    title: "Digestion",
    prompts: ["digestion process", "digestive system journey"],
    builds: "Journey through a system",
    preferredVisual: "Path through mouth → stomach → intestines with stage labels",
    status: "seeded",
  },
  {
    id: "rock-cycle",
    tier: 2,
    kind: "process",
    title: "The rock cycle",
    prompts: ["rock cycle", "rock cycle diagram"],
    builds: "Another loop, different domain",
    preferredVisual: "Igneous ↔ sedimentary ↔ metamorphic loop",
    status: "seeded",
  },
  {
    id: "rocket-launch",
    tier: 2,
    kind: "process",
    title: "Rocket launch / escape velocity",
    prompts: ["rocket launch", "escape velocity", "how rockets work"],
    builds: "Force + motion over time",
    preferredVisual: "Rocket + force arrows + velocity over staged timeline",
    status: "seeded",
    assetId: "rocket-simple",
    notes: "May reuse / extend airplane force-arrow patterns",
  },

  // ── Tier 3 — Abstract / metaphor ──────────────────────────────────
  {
    id: "java-class",
    tier: 3,
    kind: "metaphor",
    title: "Java class",
    prompts: [
      "what is a class in Java",
      "java class",
      "oop class",
      "class vs object",
    ],
    builds: "Template vs instance intuition",
    preferredVisual: "Blueprint / template → instances built from it",
    forbiddenVisuals: [
      "classroom-blueprint",
      "classroom",
      "school room",
    ],
    metaphorRisk: true,
    status: "seeded",
    assetId: "class-blueprint",
    notes:
      "CRITICAL: Use blueprint/template, never classroom. Wired via metaphor map → class-blueprint.",
  },
  {
    id: "stack-ds",
    tier: 3,
    kind: "metaphor",
    title: "Stack (data structure)",
    prompts: ["what is a stack", "stack data structure", "LIFO"],
    builds: "Plates/spring-load; LIFO",
    preferredVisual: "Stack of plates / frames; push/pop on top",
    metaphorRisk: false,
    status: "seeded",
    assetId: "stack-plates",
  },
  {
    id: "queue-ds",
    tier: 3,
    kind: "metaphor",
    title: "Queue",
    prompts: ["what is a queue", "queue data structure", "FIFO"],
    builds: "Line at a shop; FIFO; compare-view with stack",
    preferredVisual: "People/line entering rear, leaving front",
    status: "planned",
  },
  {
    id: "variable",
    tier: 3,
    kind: "metaphor",
    title: "Variable",
    prompts: ["what is a variable", "variable in programming"],
    builds: "Named storage; stance on value vs reference",
    preferredVisual: "Labeled box holding a value (v1); evolve for references",
    metaphorRisk: true,
    status: "planned",
    notes:
      "Box-holding-value breaks for reference types later — decide stance early",
  },
  {
    id: "function",
    tier: 3,
    kind: "metaphor",
    title: "Function",
    prompts: ["what is a function", "functions in programming"],
    builds: "Machine: input → black box → output",
    preferredVisual: "Input chute → machine → output",
    status: "planned",
  },
  {
    id: "recursion",
    tier: 3,
    kind: "metaphor",
    title: "Recursion",
    prompts: ["what is recursion", "recursive function"],
    builds: "Self-similar call structure",
    preferredVisual: "Russian dolls or mirrors-in-mirrors (pick one and stick)",
    metaphorRisk: true,
    status: "seeded",
    assetId: "tabler-layers",
    notes: "Hardest to animate well; high payoff if done carefully",
  },
  {
    id: "pointer-reference",
    tier: 3,
    kind: "metaphor",
    title: "Pointer / reference",
    prompts: ["what is a pointer", "reference vs value", "pointers"],
    builds: "Arrow-to-a-box; evolves the variable metaphor",
    preferredVisual: "Variable box containing an arrow to another box",
    metaphorRisk: true,
    status: "planned",
  },
  {
    id: "loop",
    tier: 3,
    kind: "metaphor",
    title: "Loop",
    prompts: ["for loop", "while loop", "what is a loop in programming"],
    builds: "Timeline literally cycles",
    preferredVisual: "Cycle ring / conveyor with repeat arrow",
    status: "seeded",
    assetId: "loop-cycle",
  },
  {
    id: "binary-bits",
    tier: 3,
    kind: "metaphor",
    title: "Binary / bits",
    prompts: ["what is binary", "bits and bytes", "ones and zeros"],
    builds: "Switches on/off animation",
    preferredVisual: "Row of switches / bits flipping 0↔1",
    status: "planned",
  },
  {
    id: "oop-inheritance",
    tier: 3,
    kind: "metaphor",
    title: "Object-oriented inheritance",
    prompts: ["inheritance in oops", "is-a relationship", "extends class"],
    builds: "Family tree; is-a vs has-a discipline",
    preferredVisual: "Type hierarchy tree (is-a), not ownership",
    metaphorRisk: true,
    status: "planned",
    notes: "is-a vs has-a trips learners — keep composition separate",
  },
  {
    id: "encryption",
    tier: 3,
    kind: "metaphor",
    title: "Encryption",
    prompts: ["what is encryption", "public key encryption"],
    builds: "Locked box + key exchange",
    preferredVisual: "Lockable box + keys (symmetric vs asymmetric later)",
    status: "planned",
  },
  {
    id: "api",
    tier: 3,
    kind: "metaphor",
    title: "API",
    prompts: ["what is an API", "how APIs work"],
    builds: "Restaurant waiter: menu → kitchen → dish",
    preferredVisual: "Client → waiter(API) → kitchen(service) → dish(response)",
    status: "planned",
  },
  {
    id: "supply-demand",
    tier: 3,
    kind: "metaphor",
    title: "Supply and demand",
    prompts: ["supply and demand", "equilibrium price"],
    builds: "Two curves meeting; economics wedge",
    preferredVisual: "Supply & demand curves with intersection",
    status: "seeded",
    assetId: "supply-demand-curves",
  },
  {
    id: "compound-interest",
    tier: 3,
    kind: "metaphor",
    title: "Compound interest",
    prompts: ["compound interest", "exponential growth money"],
    builds: "Snowball / exponential growth",
    preferredVisual: "Growing snowball or stacked growth over time",
    status: "seeded",
    assetId: "compound-growth",
  },
  {
    id: "entropy",
    tier: 3,
    kind: "metaphor",
    title: "Entropy",
    prompts: ["what is entropy", "entropy in thermodynamics"],
    builds: "Correct physical intuition — not vague disorder",
    preferredVisual: "TBD — avoid lazy 'messy room' metaphor",
    metaphorRisk: true,
    status: "seeded",
    assetId: "tabler-flame",
    notes: "'Disorder' is the common wrong metaphor; genuinely hard",
  },

  // ── Tier 4 — Math ─────────────────────────────────────────────────
  {
    id: "pythagorean-theorem",
    tier: 4,
    kind: "math",
    title: "Pythagorean theorem",
    prompts: ["Pythagoras theorem", "pythagorean theorem", "a2 + b2 = c2"],
    builds: "Board-script proof with formula and example",
    preferredVisual: "Pen board script + formula (not a fixed stock triangle)",
    forbiddenVisuals: ["horse-rider", "airplane-side-view"],
    status: "seeded",
    notes: "Taught dynamically via board_script — no hardcoded right-triangle template",
  },
  {
    id: "sine-unit-circle",
    tier: 4,
    kind: "math",
    title: "Sine / unit circle",
    prompts: ["sine wave", "unit circle sine", "what is sine"],
    builds: "Rotating point → wave traced out",
    preferredVisual: "Unit circle + traced sine wave (pitch screenshot)",
    status: "seeded",
    assetId: "tabler-wave-sine",
  },
  {
    id: "derivative-tangent",
    tier: 4,
    kind: "math",
    title: "Derivative / slope of tangent",
    prompts: ["what is a derivative", "tangent slope", "limit definition of derivative"],
    builds: "Zoom into a curve until it's a line",
    preferredVisual: "Curve + secant → tangent zoom",
    status: "seeded",
    assetId: "tabler-math-function",
  },
  {
    id: "fractions",
    tier: 4,
    kind: "math",
    title: "Fractions",
    prompts: ["what is a fraction", "fractions pizza", "1/2 and 1/4"],
    builds: "Pizza/bar splitting",
    preferredVisual: "Circle or bar partitioned into equal parts",
    status: "seeded",
    assetId: "tabler-pizza",
  },
  {
    id: "area-circle",
    tier: 4,
    kind: "math",
    title: "Area of a circle",
    prompts: ["area of a circle", "pi r squared proof"],
    builds: "Unrolling into a triangle (πr² proof)",
    preferredVisual: "Circle unrolled → triangle/parallelogram area story",
    status: "seeded",
    assetId: "tabler-circle",
  },
  {
    id: "vectors",
    tier: 4,
    kind: "math",
    title: "Vectors",
    prompts: ["what is a vector", "vector addition", "tip to tail"],
    builds: "Arrows, addition tip-to-tail",
    preferredVisual: "Arrow vectors with tip-to-tail sum",
    status: "seeded",
    assetId: "tabler-vector",
  },
  {
    id: "probability",
    tier: 4,
    kind: "math",
    title: "Probability",
    prompts: ["probability basics", "coin probability", "sample space"],
    builds: "Dice/coin sample space",
    preferredVisual: "Sample space grid + highlighted outcomes",
    status: "seeded",
    assetId: "tabler-dice",
  },
  {
    id: "logarithms",
    tier: 4,
    kind: "math",
    title: "Logarithms",
    prompts: ["what is a logarithm", "log base 10"],
    builds: "Test of visualization limits",
    preferredVisual: "TBD — exponent ↔ log inverse relationship",
    metaphorRisk: true,
    status: "seeded",
    assetId: "tabler-log-ratio",
  },
  {
    id: "matrix-multiplication",
    tier: 4,
    kind: "math",
    title: "Matrix multiplication",
    prompts: ["matrix multiplication", "matrices transform space"],
    builds: "Grid transformation / rotation of space",
    preferredVisual: "2D grid morph under matrix",
    status: "seeded",
    assetId: "tabler-matrix",
  },
  {
    id: "standard-deviation",
    tier: 4,
    kind: "math",
    title: "Standard deviation",
    prompts: ["standard deviation", "what is std deviation"],
    builds: "Spread around a mean, animated dots",
    preferredVisual: "Dot cloud around mean ± σ bands",
    status: "seeded",
    assetId: "tabler-chart-dots",
  },
  {
    id: "prime-numbers",
    tier: 4,
    kind: "math",
    title: "Prime numbers",
    prompts: ["prime numbers", "sieve of eratosthenes"],
    builds: "Sieve of Eratosthenes animation",
    preferredVisual: "Number grid with strike-through sieve stages",
    status: "seeded",
    assetId: "tabler-list-numbers",
  },
  {
    id: "slope-intercept",
    tier: 4,
    kind: "math",
    title: "Slope-intercept (y = mx + b)",
    prompts: ["y = mx + b", "slope intercept form", "slope and intercept"],
    builds: "Line moving as m and b change; interactive",
    preferredVisual: "Axes + line with live m/b controls",
    status: "seeded",
    assetId: "tabler-math-function",
  },
];

export function topicsByTier(tier: TopicTier): CurriculumTopic[] {
  return STARTER_TOPICS.filter((t) => t.tier === tier);
}

export function metaphorRiskTopics(): CurriculumTopic[] {
  return STARTER_TOPICS.filter((t) => t.metaphorRisk);
}

export function getCurriculumTopic(id: string): CurriculumTopic | undefined {
  return STARTER_TOPICS.find((t) => t.id === id);
}
