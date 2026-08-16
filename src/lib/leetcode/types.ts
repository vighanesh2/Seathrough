export const ALGO_PATTERNS = [
  "hash_map",
  "two_pointers",
  "sliding_window",
  "binary_search",
  "stack",
] as const;

export type AlgoPattern = (typeof ALGO_PATTERNS)[number];

export const ALGO_PATTERN_LABELS: Record<AlgoPattern, string> = {
  hash_map: "Hash map",
  two_pointers: "Two pointers",
  sliding_window: "Sliding window",
  binary_search: "Binary search",
  stack: "Stack",
};

export const CELL_STATES = [
  "default",
  "active",
  "pointer",
  "matched",
  "discarded",
  "window",
] as const;

export type CellState = (typeof CELL_STATES)[number];

export type AlgoCell = {
  index: number;
  value: string;
  state: CellState;
};

export type AlgoPointer = {
  index: number;
  label: string;
};

export type AlgoTableRow = {
  key: string;
  value: string;
};

export type AlgoVar = {
  name: string;
  value: string;
};

export type AlgoFrame = {
  id: string;
  title: string;
  note: string;
  cells: AlgoCell[];
  pointers: AlgoPointer[];
  /** Optional second structure (e.g. hash table or stack). */
  auxTitle?: string;
  auxRows?: AlgoTableRow[];
  vars: AlgoVar[];
  truncated?: boolean;
};

export type AlgoSpec = {
  pattern: AlgoPattern;
  title: string;
  /** Human-readable problem summary. */
  summary: string;
  /** Numeric array input when applicable. */
  nums?: number[];
  /** String input when applicable. */
  text?: string;
  target?: number;
  /** How the input was obtained. */
  source: "heuristic" | "llm" | "default";
  /** True when we could not confidently classify. */
  supported: boolean;
};

export type AlgoVisualizeResult = {
  spec: AlgoSpec;
  frames: AlgoFrame[];
};

export const MAX_CELLS = 20;

export const PATTERN_DEFAULTS: Record<
  AlgoPattern,
  {
    title: string;
    summary: string;
    nums?: number[];
    text?: string;
    target?: number;
  }
> = {
  hash_map: {
    title: "Two Sum",
    summary: "Find two indices whose values add up to the target.",
    nums: [2, 7, 11, 15],
    target: 9,
  },
  two_pointers: {
    title: "Valid Palindrome",
    summary: "Check whether a string reads the same forwards and backwards.",
    text: "race a car",
  },
  sliding_window: {
    title: "Longest Substring Without Repeating Characters",
    summary: "Find the longest substring with all unique characters.",
    text: "abcabcbb",
  },
  binary_search: {
    title: "Binary Search",
    summary: "Find a target value in a sorted array.",
    nums: [-1, 0, 3, 5, 9, 12],
    target: 9,
  },
  stack: {
    title: "Valid Parentheses",
    summary: "Check whether brackets are correctly matched and nested.",
    text: "()[]{}",
  },
};
