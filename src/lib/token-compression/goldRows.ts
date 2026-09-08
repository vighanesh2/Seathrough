/**
 * Gold sheet fixtures — typed from docs/token-compression-gold-set.md.
 * Phrase lists are whole phrases only (never single words like "oxygen").
 */

export type GoldScope = {
  include: string;
  exclude: string;
};

export type GoldARow = {
  kind: "rewrite_and_run";
  id: number;
  slug: string;
  title: string;
  sloppyDraft: string;
  tightAsk: string;
  contentName: string;
  scope: GoldScope;
  coreConceptSummary: string;
  nextStep: string;
  mapping: string;
  intuitionPath: string;
  badLongPane: string;
  shipShort: string;
  failureNote: string;
  sibling: string;
  passLooksLike: string;
  /** Whole phrases for hitsForbiddenClaims — keep specific. */
  mustNotClaim: readonly string[];
  /** Seed stage 1 rows used with --limit=seed */
  seed?: boolean;
};

export type GoldBRow = {
  kind: "stop_and_ask";
  id: number;
  slug: string;
  title: string;
  sloppyDraft: string;
  behavior: string;
  failureNote: string;
  /** Survey / invented titles that must not appear if decision were run. */
  forbiddenTitles: readonly string[];
  seed?: boolean;
};

export type OffGoldExpectKind =
  | "ship_or_ask"
  | "prefer_ask"
  | "refuse_blob";

/**
 * Locked off-gold drafts — docs/token-compression-off-gold.md
 * No handwritten ship-short. Eval runs Pipe A first, then Pipe B only on run.
 */
export type OffGoldAsk = {
  id: string;
  n: number;
  draft: string;
  expect: string;
  kind: OffGoldExpectKind;
  /** Nearby gold mustNotClaim / failure phrases — refuse if pane wanders there. */
  nearbyForbidden: readonly string[];
  /** Survey / course titles that must not appear in ask or run copy. */
  forbiddenSurveyTitles: readonly string[];
  /** Human stranger skim samples (atrium, moon, organic). */
  humanReadSample?: boolean;
};

function expandBadLong(seed: string, topicPad: string): string {
  return [
    `It is important to note that ${seed}`,
    `Furthermore, as we all know, ${topicPad}`,
    "In conclusion, learners should also survey neighboring topics before focusing.",
  ].join(" ");
}

/** Stage-1 seed: Java, heart, field, orbit #21 */
export const GOLD_A_SEED_SLUGS = [
  "java-class",
  "heart-pump",
  "electric-field",
  "orbit",
] as const;

export const GOLD_B_SEED_SLUG = "whole-codebase" as const;

export const GOLD_A_ROWS: readonly GoldARow[] = [
  {
    kind: "rewrite_and_run",
    id: 1,
    slug: "java-class",
    title: "Java class vs instance",
    seed: true,
    sloppyDraft: "explain what a class is in java",
    tightAsk: "Java class — blueprint vs one object. Not inheritance.",
    contentName: "Java class",
    scope: {
      include: "blueprint vs one object",
      exclude: "inheritance, interfaces, whole OOP course",
    },
    coreConceptSummary:
      "A class is the blueprint; an object is one thing built from that blueprint.",
    nextStep:
      "Write one new and name what stays on the class vs the object.",
    mapping:
      "Classroom = class. Two students = objects. Classroom still; you may add a student.",
    intuitionPath:
      "Same seating chart, different people — shared plan vs one instance.",
    badLongPane: expandBadLong(
      "OOP pillars survey including encapsulation, inheritance, and polymorphism.",
      "a class is a fundamental construct used to model real-world entities.",
    ),
    shipShort:
      "Blueprint vs one built thing. Classroom / students. Next: one new.",
    failureNote: "Class = object.",
    sibling: "Write a Dog class and one Dog object. What is shared?",
    passLooksLike:
      "Blueprint vs this dog; they do not say class = object.",
    mustNotClaim: [
      "class = object",
      "a class is an object",
      "oop has four pillars",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 2,
    slug: "hash-map",
    title: "Hash map",
    sloppyDraft: "How does a hash map work?",
    tightAsk: "Hash map — key → slot → value. Not a collision-theory course.",
    contentName: "Hash map",
    scope: {
      include: "key to slot to value",
      exclude: "full collision-theory course",
    },
    coreConceptSummary:
      "A hash map turns a key into a locker number and stores the value there.",
    nextStep: "Trace one key to one locker.",
    mapping: "Wall of lockers. Still; one door may open.",
    intuitionPath: "Ticket → locker number → thing inside.",
    badLongPane: expandBadLong(
      "Big-O and every collision method in a survey.",
      "hash maps are used everywhere in industry.",
    ),
    shipShort:
      "Hash the key. That number is the locker. Value lives there. Collision = short list in that locker.",
    failureNote: "A hash map is just an array.",
    sibling: 'Where does "userId" go if two keys hash to locker 4?',
    passLooksLike: "Same locker, short list — not overwrite the map.",
    mustNotClaim: [
      "hash map is just an array",
      "hash map = array with no collisions",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 3,
    slug: "recursion-stack",
    title: "Recursion call stack",
    sloppyDraft: "explain recursion i never get the stack",
    tightAsk: "Recursion — stack frames for one factorial-style call.",
    contentName: "Recursion",
    scope: {
      include: "stack frames for one factorial-style call",
      exclude: "Fibonacci trees survey",
    },
    coreConceptSummary: "Each call pushes a frame; return pops it.",
    nextStep: "Three frames for fact(3).",
    mapping: "Stack of trays. Top = live call. May grow/shrink; tray shape still.",
    intuitionPath: "New tray per call; work is only the top tray.",
    badLongPane: expandBadLong(
      "Fibonacci and trees survey of recursion.",
      "recursion appears in many algorithms.",
    ),
    shipShort:
      "New tray per call. Base case returns. Work is always the top tray.",
    failureNote: "Recursion is just a loop.",
    sibling: "After fact(3) calls fact(2), which tray is live?",
    passLooksLike:
      "The fact(2) tray on top; fact(3) is underneath waiting.",
    mustNotClaim: ["recursion is just a loop", "recursion = a for-loop"],
  },
  {
    kind: "rewrite_and_run",
    id: 4,
    slug: "jwt-auth",
    title: "JWT auth flow",
    sloppyDraft: "how does jwt auth work in my api",
    tightAsk:
      "JWT — signed ticket issued at login, sent on later requests. Not OAuth.",
    contentName: "JWT",
    scope: {
      include: "signed ticket at login, sent later",
      exclude: "OAuth",
    },
    coreConceptSummary:
      "The server trusts the signature on the ticket, not a session row.",
    nextStep: "Split one token into header / payload / signature.",
    mapping: "Wristband at a door. Still.",
    intuitionPath:
      "Stamp at the desk; later the door only checks the stamp.",
    badLongPane: expandBadLong(
      "Cookies vs tokens history survey.",
      "authentication has many standards.",
    ),
    shipShort:
      "Login stamps a ticket. Client sends it. Door checks the stamp.",
    failureNote: "JWT is encryption.",
    sibling: "Can someone read the payload without the secret?",
    passLooksLike:
      "Yes, readable; they cannot forge it without the stamp.",
    mustNotClaim: ["jwt is encryption", "jwt encrypts the payload"],
  },
  {
    kind: "rewrite_and_run",
    id: 5,
    slug: "rag-pipeline",
    title: "RAG pipeline",
    sloppyDraft: "explain rag like the pipeline",
    tightAsk: "RAG — retrieve chunks, then generate from those chunks.",
    contentName: "RAG",
    scope: {
      include: "retrieve then generate from chunks",
      exclude: "embedding bake-off",
    },
    coreConceptSummary: "Find notes first, then write from those notes.",
    nextStep: "Name query → retrieve → generate.",
    mapping:
      "Librarian puts three books on the table; writer uses only those.",
    intuitionPath: "No book on the table → do not invent it.",
    badLongPane: expandBadLong(
      "Embedding model bake-off survey.",
      "retrieval augmented generation is popular.",
    ),
    shipShort: "Search. Keep a few passages. Write from those.",
    failureNote: "RAG is just ChatGPT.",
    sibling: "If retrieve returns nothing, what should generate do?",
    passLooksLike:
      "Say it does not know / empty table — not a confident essay.",
    mustNotClaim: ["rag is just chatgpt", "rag trains the model"],
  },
  {
    kind: "rewrite_and_run",
    id: 6,
    slug: "heart-pump",
    title: "Heart as a pump",
    seed: true,
    sloppyDraft: "how does the heart work",
    tightAsk: "Heart — two pumps, four chambers. Not every ion channel.",
    contentName: "Heart",
    scope: {
      include: "two pumps, four chambers",
      exclude: "every ion channel, ECG survey",
    },
    coreConceptSummary: "Right side → lungs. Left side → body.",
    nextStep: "Trace one drop through the four rooms.",
    mapping:
      "Two boxes, four rooms, two outgoing pipes. Still; one drop may be marked.",
    intuitionPath: "Two pumps in one organ; valves stop backflow.",
    badLongPane: expandBadLong(
      "ECG and disease survey of the heart.",
      "cardiology covers many subsystems.",
    ),
    shipShort: "Right pump → lungs. Left pump → body. Next: one drop.",
    failureNote: "The heart oxygenates the blood.",
    sibling: "Where does blood go after the right ventricle?",
    passLooksLike: "Lungs — not to the body.",
    mustNotClaim: [
      "heart oxygenates",
      "the heart oxygenates the blood",
      "the heart adds the oxygen",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 7,
    slug: "blood-path",
    title: "Blood path through the heart",
    sloppyDraft: "i get lost when they say right ventricle then lungs",
    tightAsk:
      "Path of deoxygenated vs oxygenated blood through the heart only.",
    contentName: "Blood path",
    scope: {
      include: "path through the heart only",
      exclude: "full capillary tour",
    },
    coreConceptSummary: "Blue side body→lungs; red side lungs→body.",
    nextStep: "Color two arrows only.",
    mapping: "Four rooms, blue right, red left. Still.",
    intuitionPath: "Do not cross sides inside the heart.",
    badLongPane: expandBadLong(
      "Full capillary tour of the body.",
      "circulation includes many vessels.",
    ),
    shipShort: "Body → right rooms → lungs → left rooms → body.",
    failureNote: "Left side is lungs because left is smaller.",
    sibling: "Blood just left the lungs. Which chamber first?",
    passLooksLike: "Left atrium.",
    mustNotClaim: [
      "left side is lungs because left is smaller",
      "sides mix in the healthy heart",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 8,
    slug: "simple-circuit",
    title: "Simple electric circuit",
    sloppyDraft: "How does a simple electric circuit work",
    tightAsk: "Series loop — battery, wire, lamp. Not AC.",
    contentName: "Series circuit",
    scope: {
      include: "battery, wire, lamp loop",
      exclude: "AC, Faraday biography",
    },
    coreConceptSummary:
      "Closed loop; the lamp is where energy is spent.",
    nextStep: "Open the loop; lamp dark.",
    mapping: "One loop. Still; wire may break.",
    intuitionPath: "Break the path, flow stops.",
    badLongPane: expandBadLong(
      "Faraday biography and history of electricity.",
      "circuits appear in every device.",
    ),
    shipShort:
      "Battery pushes. Wire is the path. Lamp uses the energy.",
    failureNote: "Current is used up in the lamp.",
    sibling: "One wire cut — is the lamp on?",
    passLooksLike: "Off.",
    mustNotClaim: [
      "current is used up in the lamp",
      "current is consumed in the bulb",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 9,
    slug: "electric-charge",
    title: "Electric charge",
    sloppyDraft: "what even is electric charge",
    tightAsk: "Two kinds; same-repel / opposite-attract.",
    contentName: "Electric charge",
    scope: {
      include: "two kinds; same repel opposite attract",
      exclude: "quark lecture",
    },
    coreConceptSummary: "Likes push apart; opposites pull together.",
    nextStep: "Two + and one +/− pair.",
    mapping: "Dots and push/pull arrows. Still.",
    intuitionPath:
      "Rubbed balloon moved charge; it did not create charge.",
    badLongPane: expandBadLong(
      "Quark lecture on fundamental particles.",
      "charge is a deep topic in physics.",
    ),
    shipShort: "Two signs. Same push. Opposite pull.",
    failureNote: "Charge is the same thing as current.",
    sibling: "Two − charges near each other — push or pull?",
    passLooksLike: "Push.",
    mustNotClaim: [
      "charge is the same thing as current",
      "charge = current",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 10,
    slug: "electric-field",
    title: "Electric field",
    seed: true,
    sloppyDraft: "i dont get electric fields",
    tightAsk: "Field — force per charge at a point around a source.",
    contentName: "Electric field",
    scope: {
      include: "force per charge at a point around a source",
      exclude: "Maxwell dump",
    },
    coreConceptSummary: 'Map of "tiny + here: which way, how hard."',
    nextStep: "One + source, two arrows of different length.",
    mapping: "Weather arrows. Still.",
    intuitionPath: "Closer to the source → longer arrow.",
    badLongPane: expandBadLong(
      "Maxwell equations dump.",
      "fields are used throughout electromagnetism.",
    ),
    shipShort:
      "Invisible map. Closer = longer arrow. Direction = push on a + test charge.",
    failureNote: "The field is the charge itself.",
    sibling: "Move the test + closer — longer or shorter arrow?",
    passLooksLike: "Longer.",
    mustNotClaim: [
      "the field is the charge itself",
      "the field is the charge",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 11,
    slug: "gravity-earth",
    title: "Gravity near Earth",
    sloppyDraft: "explain gravity like why things fall",
    tightAsk:
      "Pull toward Earth’s center; same rate if air does not matter. Not GR. Not orbits.",
    contentName: "Gravity near Earth",
    scope: {
      include: "pull toward center; same rate without air",
      exclude: "GR, orbits",
    },
    coreConceptSummary:
      "Earth pulls every object toward its center; near the ground they fall together without air.",
    nextStep: "Two balls dropped together.",
    mapping: "Earth circle, two balls, arrows to center. Still.",
    intuitionPath: "Down = toward center; air is why a feather lags.",
    badLongPane: expandBadLong(
      "Newton bio and Einstein detour.",
      "gravity has many advanced theories.",
    ),
    shipShort:
      "Toward Earth’s center. Vacuum: hammer and pebble together. Weight = that pull on this object.",
    failureNote: "Heavier things fall faster",
    sibling: "Hammer and feather on the Moon — who hits first?",
    passLooksLike: "Together (no air).",
    mustNotClaim: [
      "heavier things fall faster",
      "heavier always hits first",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 12,
    slug: "gravity-vs-electric",
    title: "Gravity vs electric force",
    sloppyDraft: "gravity and electric charge feel the same to me",
    tightAsk:
      "Gravity always pulls mass; electric can pull or push charge.",
    contentName: "Gravity vs electric",
    scope: {
      include: "gravity attract vs electric pull or push",
      exclude: "unify the four forces",
    },
    coreConceptSummary: "Gravity one sign (attract); electric two signs.",
    nextStep: "Two masses vs two + charges.",
    mapping: "Two still panels.",
    intuitionPath: "Mass never repels; charge can.",
    badLongPane: expandBadLong(
      "Unify the four forces survey.",
      "fundamental forces are a large topic.",
    ),
    shipShort: "Mass always attracts. Charge can attract or repel.",
    failureNote: "Gravity is just weak electricity.",
    sibling: "Can two masses push apart by gravity alone?",
    passLooksLike: "No.",
    mustNotClaim: [
      "gravity is just weak electricity",
      "gravity has a repel mode like charge",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 13,
    slug: "chain-rule",
    title: "Chain rule",
    sloppyDraft: "chain rule please i always mess it up",
    tightAsk: "Derivative of f(g(x)) only.",
    contentName: "Chain rule",
    scope: {
      include: "derivative of f(g(x))",
      exclude: "related-rates chapter",
    },
    coreConceptSummary: "Outside change times inside change.",
    nextStep: "sin(x^2).",
    mapping: "Two machines in a line. Still.",
    intuitionPath: "Crank inner; outer moves after.",
    badLongPane: expandBadLong(
      "Related-rates chapter survey.",
      "calculus has many differentiation rules.",
    ),
    shipShort:
      "dy/dx = dy/du · du/dx. Outer, leave inner, times inner.",
    failureNote: "Differentiate everything and add.",
    sibling: "Derivative of cos(3x).",
    passLooksLike: "-sin(3x)·3.",
    mustNotClaim: [
      "differentiate everything and add",
      "add the two derivatives",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 14,
    slug: "slope-hill",
    title: "Slope on a hill",
    sloppyDraft: "Explain slope visually using a hill.",
    tightAsk: "Rise over run. Not derivatives.",
    contentName: "Slope",
    scope: {
      include: "rise over run",
      exclude: "derivatives, all slope types survey",
    },
    coreConceptSummary: "Slope is up per step across.",
    nextStep: "Two points on the hill.",
    mapping: "Hill side-view. Still.",
    intuitionPath: "One step across, this much up.",
    badLongPane: expandBadLong(
      "All slope types survey.",
      "slope appears throughout algebra.",
    ),
    shipShort: "Rise / run. Steeper = larger number.",
    failureNote: "Slope is the height of the hill.",
    sibling: "Rise 3, run 6 — slope?",
    passLooksLike: "1/2.",
    mustNotClaim: [
      "slope is the height of the hill",
      "slope = height",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 15,
    slug: "integral-area",
    title: "Integral as area",
    sloppyDraft: "what is an integral using area under the curve",
    tightAsk: "Definite integral = signed area from a to b.",
    contentName: "Integral as area",
    scope: {
      include: "signed area from a to b",
      exclude: "every integration trick",
    },
    coreConceptSummary: "Add thin slices between curve and axis.",
    nextStep: "One slice f(x) Δx.",
    mapping: "Curve + shaded slices. Curve still.",
    intuitionPath: "Thin rectangles added up.",
    badLongPane: expandBadLong(
      "Every integration trick survey.",
      "integrals appear throughout calculus.",
    ),
    shipShort:
      "Thin rectangles. Add them. Below axis is negative.",
    failureNote: "integral is anti-derivative",
    sibling:
      "If the curve is below the axis, is the integral positive?",
    passLooksLike: "Negative (signed).",
    mustNotClaim: [
      "only integral is anti-derivative",
      "this canvas is integration techniques",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 16,
    slug: "photosynthesis",
    title: "Photosynthesis",
    sloppyDraft: "Explain how photosynthesis works",
    tightAsk:
      "Leaf factory — light, water, CO₂ in; sugar and O₂ out.",
    contentName: "Photosynthesis",
    scope: {
      include: "light water CO2 in; sugar O2 out",
      exclude: "full Calvin cycle",
    },
    coreConceptSummary: "Light + water + CO₂ → sugar + oxygen.",
    nextStep: "Four arrows labeled.",
    mapping: "Leaf as still factory.",
    intuitionPath:
      "Factory with four pipes, not plants breathe opposite.",
    badLongPane: expandBadLong(
      "Full Calvin cycle survey.",
      "plant biology has many pathways.",
    ),
    shipShort: "Light, water, CO₂ in. Sugar stays. Oxygen out.",
    failureNote:
      "Plants breathe the opposite of humans",
    sibling: "What leaves the leaf that animals use to breathe?",
    passLooksLike: "Oxygen.",
    mustNotClaim: [
      "plants breathe the opposite of humans",
      "this canvas is the full calvin pathway",
    ],
  },
  {
    kind: "rewrite_and_run",
    id: 21,
    slug: "orbit",
    title: "Planets orbit the sun",
    seed: true,
    sloppyDraft: "why do planets orbit the sun",
    tightAsk:
      "Orbit — falling sideways so you keep missing the body. Not GR. Not a college orbital-mechanics course.",
    contentName: "Orbit",
    scope: {
      include: "falling sideways; keep missing the body",
      exclude: "GR, college orbital mechanics",
    },
    coreConceptSummary:
      "An orbit is falling while moving sideways fast enough that you keep missing what you fall toward.",
    nextStep:
      "Four stills: cannon on a mountain, four muzzle speeds.",
    mapping:
      "Mountain + Earth curve + four still shots. Earth still. Sun at a focus if ellipse later, never the center.",
    intuitionPath:
      "Newton cannon — faster sideways, impact farther, until the curve falls away as fast as the shot falls.",
    badLongPane: expandBadLong(
      "Gravity and inertia magically make ellipses. Kepler slogans.",
      "orbital mechanics is a full college course.",
    ),
    shipShort:
      "Drop a ball: it falls in. Fire sideways: it falls while moving. Faster → farther around the curve. Fast enough, the ground curves away as fast as it falls — that path is the orbit. Next canvas: ellipse with the sun at a focus, not the center.",
    failureNote: "Gravity just makes planets go around.",
    sibling:
      "Fire the cannon a bit slower than orbit speed. Where does the ball land?",
    passLooksLike:
      "Hits the ground ahead, still falling in — not it floats.",
    mustNotClaim: [
      "gravity just makes planets go around",
      "sun at the center",
      "sun at the center of the ellipse",
      "this replaces orbital mechanics",
      "gravity is magic glue",
    ],
  },
];

export const GOLD_B_ROWS: readonly GoldBRow[] = [
  {
    kind: "stop_and_ask",
    id: 17,
    slug: "whole-codebase",
    title: "Whole codebase",
    seed: true,
    sloppyDraft: "explain to me this code base + paste",
    behavior: "Ask which one canvas.",
    failureNote: 'Survey "Introduction to the codebase."',
    forbiddenTitles: [
      "introduction to the codebase",
      "introduction to codebases",
      "managing overhead",
    ],
  },
  {
    kind: "stop_and_ask",
    id: 18,
    slug: "any-math",
    title: "Any math topic",
    sloppyDraft: "is there any math topic that you can explain",
    behavior: "Offer slope or chain rule; wait.",
    failureNote: "Auto-picking linear functions.",
    forbiddenTitles: [
      "introduction to mathematics",
      "linear functions survey",
    ],
  },
  {
    kind: "stop_and_ask",
    id: 19,
    slug: "differential-equations",
    title: "Differential equations",
    sloppyDraft: "Can you explain differential equations",
    behavior: "What is changing, first vs second order.",
    failureNote: '"DEs are equations with derivatives" as the canvas.',
    forbiddenTitles: [
      "introduction to differential equations",
      "des are equations with derivatives",
    ],
  },
  {
    kind: "stop_and_ask",
    id: 20,
    slug: "off-wedge-ops",
    title: "Off-wedge ops",
    sloppyDraft:
      "I am building a junk removal company and need to scale overhead",
    behavior: 'Do not invent "Managing Overhead."',
    failureNote: "A generated business-ops title.",
    forbiddenTitles: ["managing overhead", "scaling overhead"],
  },
];

/** Locked off-gold drafts — see docs/token-compression-off-gold.md */
export const OFF_GOLD_ASKS: readonly OffGoldAsk[] = [
  {
    id: "og-1",
    n: 1,
    draft: "why do we have two atriums",
    expect: "Ship or ask (heart rooms — not row 6/7 verbatim).",
    kind: "ship_or_ask",
    humanReadSample: true,
    nearbyForbidden: [
      "heart oxygenates",
      "the heart oxygenates the blood",
      "the heart adds the oxygen",
      "sides mix in the healthy heart",
    ],
    forbiddenSurveyTitles: [
      "introduction to the heart",
      "all of cardiology",
    ],
  },
  {
    id: "og-2",
    n: 2,
    draft: "what is a voltage",
    expect: "Ship one canvas, or ask vs current.",
    kind: "ship_or_ask",
    nearbyForbidden: [
      "charge is the same thing as current",
      "charge = current",
      "current is used up in the lamp",
    ],
    forbiddenSurveyTitles: [
      "introduction to electricity",
      "all of electromagnetism",
    ],
  },
  {
    id: "og-3",
    n: 3,
    draft: "why doesn't the moon fall into the earth",
    expect: "New tight ask related to #21; not \"things fall\" from #11.",
    kind: "ship_or_ask",
    humanReadSample: true,
    nearbyForbidden: [
      "sun at the center",
      "sun at the center of the ellipse",
      "gravity just makes planets go around",
      "this replaces orbital mechanics",
      "gravity is magic glue",
      "heavier things fall faster",
      "heavier always hits first",
    ],
    forbiddenSurveyTitles: [
      "introduction to gravity",
      "introduction to orbital mechanics",
    ],
  },
  {
    id: "og-4",
    n: 4,
    draft: "explain encapsulation in java",
    expect:
      "Ship encapsulation or ask vs class-vs-object. Do not reuse row 1 classroom as encapsulation.",
    kind: "ship_or_ask",
    nearbyForbidden: [
      "class = object",
      "a class is an object",
      "oop has four pillars",
    ],
    forbiddenSurveyTitles: [
      "introduction to java",
      "introduction to oop",
    ],
  },
  {
    id: "og-5",
    n: 5,
    draft: "how does a for loop work",
    expect: "Ship one canvas.",
    kind: "ship_or_ask",
    nearbyForbidden: [
      "recursion is just a loop",
      "recursion = a for-loop",
    ],
    forbiddenSurveyTitles: [
      "introduction to programming",
      "all of control flow",
    ],
  },
  {
    id: "og-6",
    n: 6,
    draft: "photosynthesis vs respiration",
    expect: "Ask which canvas — do not merge into row 16.",
    kind: "prefer_ask",
    nearbyForbidden: [
      "plants breathe the opposite of humans",
      "this canvas is the full calvin pathway",
    ],
    forbiddenSurveyTitles: [
      "introduction to biology",
      "all of photosynthesis",
    ],
  },
  {
    id: "og-7",
    n: 7,
    draft: "what is potential energy",
    expect: "Ship or ask vs kinetic.",
    kind: "ship_or_ask",
    nearbyForbidden: [
      "heavier things fall faster",
      "gravity is just weak electricity",
    ],
    forbiddenSurveyTitles: [
      "introduction to energy",
      "all of mechanics",
    ],
  },
  {
    id: "og-8",
    n: 8,
    draft: "explain binary search",
    expect: "Ship one canvas.",
    kind: "ship_or_ask",
    nearbyForbidden: [],
    forbiddenSurveyTitles: [
      "introduction to algorithms",
      "all of searching",
    ],
  },
  {
    id: "og-9",
    n: 9,
    draft: "tell me all of organic chemistry",
    expect: "Refuse / ask — B-shaped blob.",
    kind: "refuse_blob",
    humanReadSample: true,
    nearbyForbidden: [],
    forbiddenSurveyTitles: [
      "all of organic chemistry",
      "introduction to organic chemistry",
      "introduction to chemistry",
      "introduction to codebases",
      "managing overhead",
    ],
  },
  {
    id: "og-10",
    n: 10,
    draft:
      "my recursion is blowing the stack in production how do I fix it",
    expect:
      "Ask: concept canvas vs debug-this-stack. Do not dump a survey of CS.",
    kind: "prefer_ask",
    nearbyForbidden: [
      "recursion is just a loop",
      "recursion = a for-loop",
    ],
    forbiddenSurveyTitles: [
      "introduction to computer science",
      "all of debugging",
      "introduction to recursion",
    ],
  },
];

export const OFF_GOLD_HUMAN_READ_IDS = [
  "og-1",
  "og-3",
  "og-9",
] as const;

/** Claudish landfill for Pipe B after Pipe A runs a tight ask. */
export function landfillFromOffGoldTightAsk(tightAsk: string): {
  beats: Array<{ id: string; kind: string; narration: string }>;
  humanSummary: string;
} {
  return landfillFromBadLongPane(
    expandBadLong(
      `a long survey dump about: ${tightAsk}`,
      "many neighboring topics and vendor bake-offs belong here too.",
    ),
  );
}

export function goldABySlug(slug: string): GoldARow | undefined {
  return GOLD_A_ROWS.find((r) => r.slug === slug);
}

export function selectGoldARows(limit: string | undefined): GoldARow[] {
  if (!limit || limit === "all") return [...GOLD_A_ROWS];
  if (limit === "seed") {
    return GOLD_A_ROWS.filter((r) => r.seed);
  }
  const n = Number(limit);
  if (Number.isFinite(n) && n > 0) return GOLD_A_ROWS.slice(0, n);
  const slugs = limit.split(",").map((s) => s.trim()).filter(Boolean);
  return GOLD_A_ROWS.filter((r) => slugs.includes(r.slug));
}

export function selectGoldBRows(limit: string | undefined): GoldBRow[] {
  if (!limit || limit === "all") return [...GOLD_B_ROWS];
  if (limit === "seed") {
    return GOLD_B_ROWS.filter((r) => r.seed);
  }
  const n = Number(limit);
  if (Number.isFinite(n) && n > 0) return GOLD_B_ROWS.slice(0, n);
  const slugs = limit.split(",").map((s) => s.trim()).filter(Boolean);
  return GOLD_B_ROWS.filter((r) => slugs.includes(r.slug));
}

/** Build landfill beats from a bad long pane for Pipe B. */
export function landfillFromBadLongPane(
  badLongPane: string,
  ids: string[] = ["b1", "b2", "b3"],
): {
  beats: Array<{ id: string; kind: string; narration: string }>;
  humanSummary: string;
} {
  const chunks = badLongPane
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const beats = ids.map((id, i) => ({
    id,
    kind: i === 0 ? "intro" : "explain",
    narration:
      chunks[i] ??
      chunks[0] ??
      "It is important to note that this topic has many aspects.",
  }));
  return {
    beats,
    humanSummary: badLongPane.slice(0, 600),
  };
}

export const STRANGER_SAMPLE_SLUGS = [
  "java-class",
  "heart-pump",
  "orbit",
] as const;
