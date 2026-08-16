import assert from "node:assert/strict";
import {
  classifyHeuristic,
  extractNumberArray,
  extractQuotedString,
  extractTarget,
} from "../src/lib/leetcode/classify";
import { leetcodeVisualizeRequestSchema } from "../src/lib/leetcode/schemas";
import { simulateAlgo } from "../src/lib/leetcode/simulate";
import { PATTERN_DEFAULTS } from "../src/lib/leetcode/types";

// Request schema edge cases
assert.equal(
  leetcodeVisualizeRequestSchema.safeParse({ prompt: "" }).success,
  false,
);
assert.equal(
  leetcodeVisualizeRequestSchema.safeParse({ prompt: "Two Sum" }).success,
  true,
);

// Input extraction
assert.deepEqual(extractNumberArray("nums = [2,7,11,15], target = 9"), [
  2, 7, 11, 15,
]);
assert.equal(extractTarget("nums = [2,7,11,15], target = 9"), 9);
assert.equal(extractQuotedString('s = "abcabcbb"'), "abcabcbb");

// Heuristic classification
const twoSum = classifyHeuristic(
  "Two Sum: nums = [2,7,11,15], target = 9",
);
assert.ok(twoSum);
assert.equal(twoSum!.pattern, "hash_map");
assert.deepEqual(twoSum!.nums, [2, 7, 11, 15]);
assert.equal(twoSum!.target, 9);

const pal = classifyHeuristic(
  'Valid Palindrome: s = "race a car"',
);
assert.ok(pal);
assert.equal(pal!.pattern, "two_pointers");
assert.equal(pal!.text, "race a car");

const window = classifyHeuristic(
  'Longest Substring Without Repeating Characters: s = "abcabcbb"',
);
assert.ok(window);
assert.equal(window!.pattern, "sliding_window");

const binary = classifyHeuristic(
  "Binary Search: nums = [-1,0,3,5,9,12], target = 9",
);
assert.ok(binary);
assert.equal(binary!.pattern, "binary_search");
assert.equal(binary!.target, 9);

const stack = classifyHeuristic('Valid Parentheses: s = "()[]{}"');
assert.ok(stack);
assert.equal(stack!.pattern, "stack");

// Low-confidence gibberish → null (API will fall back)
assert.equal(classifyHeuristic("hello world weather today"), null);

// --- Simulators ---

// Two Sum finds [0,1]
{
  const frames = simulateAlgo(twoSum!);
  const last = frames[frames.length - 1]!;
  assert.match(last.note, /Return \[0, 1\]/);
  const result = last.vars.find((v) => v.name === "result");
  assert.equal(result?.value, "[0, 1]");
  assert.ok(frames.some((f) => f.auxRows && f.auxRows.length > 0));
}

// Valid palindrome — "race a car" is false
{
  const frames = simulateAlgo(pal!);
  const last = frames[frames.length - 1]!;
  assert.equal(
    last.vars.find((v) => v.name === "result")?.value,
    "false",
  );
}

// True palindrome
{
  const frames = simulateAlgo({
    pattern: "two_pointers",
    title: "Valid Palindrome",
    summary: "check",
    text: "aba",
    source: "heuristic",
    supported: true,
  });
  const last = frames[frames.length - 1]!;
  assert.equal(last.vars.find((v) => v.name === "result")?.value, "true");
}

// Sliding window on "abcabcbb" → best 3 ("abc")
{
  const frames = simulateAlgo(window!);
  const last = frames[frames.length - 1]!;
  assert.equal(last.vars.find((v) => v.name === "result")?.value, "3");
  assert.ok(frames.some((f) => /Repeat/.test(f.title)));
}

// Binary search finds index of 9
{
  const frames = simulateAlgo(binary!);
  const last = frames[frames.length - 1]!;
  assert.equal(last.vars.find((v) => v.name === "result")?.value, "4");
  assert.match(last.note, /Found|Return index 4/i);
}

// Valid parentheses
{
  const frames = simulateAlgo(stack!);
  const last = frames[frames.length - 1]!;
  assert.equal(last.vars.find((v) => v.name === "result")?.value, "true");
  assert.ok(frames.some((f) => f.auxTitle?.includes("Stack")));
}

// Invalid parentheses
{
  const frames = simulateAlgo({
    pattern: "stack",
    title: "Valid Parentheses",
    summary: "check",
    text: "(]",
    source: "heuristic",
    supported: true,
  });
  const last = frames[frames.length - 1]!;
  assert.equal(last.vars.find((v) => v.name === "result")?.value, "false");
}

// Defaults still produce frames
{
  const frames = simulateAlgo({
    pattern: "hash_map",
    title: PATTERN_DEFAULTS.hash_map.title,
    summary: PATTERN_DEFAULTS.hash_map.summary,
    nums: PATTERN_DEFAULTS.hash_map.nums,
    target: PATTERN_DEFAULTS.hash_map.target,
    source: "default",
    supported: false,
  });
  assert.ok(frames.length >= 2);
}

// Truncation: >20 cells
{
  const big = Array.from({ length: 25 }, (_, i) => i);
  const frames = simulateAlgo({
    pattern: "binary_search",
    title: "Binary Search",
    summary: "search",
    nums: big,
    target: 24,
    source: "heuristic",
    supported: true,
  });
  assert.equal(frames[0]!.cells.length, 20);
  assert.equal(frames[0]!.truncated, true);
}

console.log("leetcode smoke checks passed");
