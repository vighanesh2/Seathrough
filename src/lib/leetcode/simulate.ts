import type {
  AlgoCell,
  AlgoFrame,
  AlgoPattern,
  AlgoPointer,
  AlgoSpec,
  AlgoTableRow,
  AlgoVar,
  CellState,
} from "@/lib/leetcode/types";
import { MAX_CELLS } from "@/lib/leetcode/types";

function cellValuesFromSpec(spec: AlgoSpec): { values: string[]; truncated: boolean } {
  if (spec.nums?.length) {
    const slice = spec.nums.slice(0, MAX_CELLS);
    return {
      values: slice.map(String),
      truncated: spec.nums.length > MAX_CELLS,
    };
  }
  if (spec.text != null) {
    const chars = [...spec.text].slice(0, MAX_CELLS);
    return {
      values: chars,
      truncated: [...spec.text].length > MAX_CELLS,
    };
  }
  return { values: [], truncated: false };
}

function makeCells(
  values: string[],
  states: Partial<Record<number, CellState>> = {},
): AlgoCell[] {
  return values.map((value, index) => ({
    index,
    value,
    state: states[index] ?? "default",
  }));
}

function frame(input: {
  id: string;
  title: string;
  note: string;
  values: string[];
  states?: Partial<Record<number, CellState>>;
  pointers?: AlgoPointer[];
  auxTitle?: string;
  auxRows?: AlgoTableRow[];
  vars?: AlgoVar[];
  truncated?: boolean;
}): AlgoFrame {
  return {
    id: input.id,
    title: input.title,
    note: input.note,
    cells: makeCells(input.values, input.states),
    pointers: input.pointers ?? [],
    auxTitle: input.auxTitle,
    auxRows: input.auxRows,
    vars: input.vars ?? [],
    truncated: input.truncated,
  };
}

function isAlnum(ch: string): boolean {
  return /[a-z0-9]/i.test(ch);
}

function simulateHashMap(spec: AlgoSpec): AlgoFrame[] {
  const { values, truncated } = cellValuesFromSpec(spec);
  const nums = values.map(Number);
  const target = spec.target ?? 9;
  const frames: AlgoFrame[] = [];
  const map = new Map<number, number>();

  frames.push(
    frame({
      id: "hm-start",
      title: "Start",
      note: `Find two indices whose values sum to ${target}. Scan left to right and remember each value in a hash map.`,
      values,
      vars: [
        { name: "target", value: String(target) },
        { name: "map", value: "{}" },
      ],
      auxTitle: "Hash map (value → index)",
      auxRows: [],
      truncated,
    }),
  );

  for (let i = 0; i < nums.length; i++) {
    const num = nums[i]!;
    const need = target - num;
    const states: Partial<Record<number, CellState>> = { [i]: "active" };
    for (const [val, idx] of map) {
      states[idx] = val === need ? "matched" : "pointer";
    }

    const rows: AlgoTableRow[] = [...map.entries()].map(([k, v]) => ({
      key: String(k),
      value: String(v),
    }));

    if (map.has(need)) {
      const j = map.get(need)!;
      states[j] = "matched";
      states[i] = "matched";
      frames.push(
        frame({
          id: `hm-${i}-hit`,
          title: `Index ${i}: found pair`,
          note: `nums[${i}] = ${num}. Need ${need}. Map already has ${need} at index ${j}. Return [${j}, ${i}].`,
          values,
          states,
          pointers: [
            { index: j, label: "j" },
            { index: i, label: "i" },
          ],
          auxTitle: "Hash map (value → index)",
          auxRows: rows,
          vars: [
            { name: "i", value: String(i) },
            { name: "need", value: String(need) },
            { name: "result", value: `[${j}, ${i}]` },
          ],
          truncated,
        }),
      );
      return frames;
    }

    frames.push(
      frame({
        id: `hm-${i}-miss`,
        title: `Index ${i}: store ${num}`,
        note: `nums[${i}] = ${num}. Need ${need}, which is not in the map yet. Store map[${num}] = ${i} and continue.`,
        values,
        states,
        pointers: [{ index: i, label: "i" }],
        auxTitle: "Hash map (value → index)",
        auxRows: rows,
        vars: [
          { name: "i", value: String(i) },
          { name: "need", value: String(need) },
          { name: "map", value: `{…, ${num}: ${i}}` },
        ],
        truncated,
      }),
    );

    map.set(num, i);
    const afterRows: AlgoTableRow[] = [...map.entries()].map(([k, v]) => ({
      key: String(k),
      value: String(v),
    }));
    frames.push(
      frame({
        id: `hm-${i}-stored`,
        title: `Map updated`,
        note: `Hash map now remembers that value ${num} appeared at index ${i}.`,
        values,
        states: { [i]: "pointer" },
        pointers: [{ index: i, label: "i" }],
        auxTitle: "Hash map (value → index)",
        auxRows: afterRows,
        vars: [
          { name: "i", value: String(i) },
          { name: "target", value: String(target) },
        ],
        truncated,
      }),
    );
  }

  frames.push(
    frame({
      id: "hm-none",
      title: "No pair",
      note: `Scanned the whole array. No two values add up to ${target}.`,
      values,
      auxTitle: "Hash map (value → index)",
      auxRows: [...map.entries()].map(([k, v]) => ({
        key: String(k),
        value: String(v),
      })),
      vars: [{ name: "result", value: "[]" }],
      truncated,
    }),
  );
  return frames;
}

function simulateTwoPointers(spec: AlgoSpec): AlgoFrame[] {
  const { values, truncated } = cellValuesFromSpec(spec);

  // Numeric heights → container with most water style
  if (spec.nums?.length && !spec.text) {
    return simulateContainer(values, truncated);
  }

  // String → valid palindrome (ignore non-alnum, case-insensitive)
  const raw = values;
  const frames: AlgoFrame[] = [];
  let left = 0;
  let right = raw.length - 1;

  frames.push(
    frame({
      id: "tp-start",
      title: "Start",
      note: "Use two pointers from both ends. Skip non-alphanumeric characters and compare case-insensitively.",
      values: raw,
      pointers: [
        { index: Math.max(0, left), label: "L" },
        { index: Math.max(0, right), label: "R" },
      ],
      vars: [
        { name: "left", value: String(left) },
        { name: "right", value: String(right) },
      ],
      truncated,
    }),
  );

  let step = 0;
  while (left < right) {
    while (left < right && !isAlnum(raw[left] ?? "")) {
      frames.push(
        frame({
          id: `tp-skip-l-${step++}`,
          title: "Skip left",
          note: `Character "${raw[left]}" is not alphanumeric. Move left pointer forward.`,
          values: raw,
          states: { [left]: "discarded" },
          pointers: [
            { index: left, label: "L" },
            { index: right, label: "R" },
          ],
          vars: [
            { name: "left", value: String(left) },
            { name: "right", value: String(right) },
          ],
          truncated,
        }),
      );
      left += 1;
    }
    while (left < right && !isAlnum(raw[right] ?? "")) {
      frames.push(
        frame({
          id: `tp-skip-r-${step++}`,
          title: "Skip right",
          note: `Character "${raw[right]}" is not alphanumeric. Move right pointer backward.`,
          values: raw,
          states: { [right]: "discarded" },
          pointers: [
            { index: left, label: "L" },
            { index: right, label: "R" },
          ],
          vars: [
            { name: "left", value: String(left) },
            { name: "right", value: String(right) },
          ],
          truncated,
        }),
      );
      right -= 1;
    }
    if (left >= right) break;

    const a = (raw[left] ?? "").toLowerCase();
    const b = (raw[right] ?? "").toLowerCase();
    if (a !== b) {
      frames.push(
        frame({
          id: `tp-mismatch-${step++}`,
          title: "Mismatch",
          note: `"${raw[left]}" ≠ "${raw[right]}" (case-insensitive). Not a palindrome.`,
          values: raw,
          states: { [left]: "active", [right]: "active" },
          pointers: [
            { index: left, label: "L" },
            { index: right, label: "R" },
          ],
          vars: [
            { name: "left", value: String(left) },
            { name: "right", value: String(right) },
            { name: "result", value: "false" },
          ],
          truncated,
        }),
      );
      return frames;
    }

    frames.push(
      frame({
        id: `tp-match-${step++}`,
        title: "Characters match",
        note: `"${raw[left]}" matches "${raw[right]}". Move both pointers inward.`,
        values: raw,
        states: { [left]: "matched", [right]: "matched" },
        pointers: [
          { index: left, label: "L" },
          { index: right, label: "R" },
        ],
        vars: [
          { name: "left", value: String(left) },
          { name: "right", value: String(right) },
        ],
        truncated,
      }),
    );
    left += 1;
    right -= 1;
  }

  frames.push(
    frame({
      id: "tp-done",
      title: "Valid palindrome",
      note: "Pointers met in the middle with every compared pair matching. The string is a palindrome.",
      values: raw,
      states: Object.fromEntries(
        raw.map((_, i) => [i, "matched" as CellState]),
      ),
      vars: [{ name: "result", value: "true" }],
      truncated,
    }),
  );
  return frames;
}

function simulateContainer(values: string[], truncated: boolean): AlgoFrame[] {
  const heights = values.map(Number);
  const frames: AlgoFrame[] = [];
  let left = 0;
  let right = heights.length - 1;
  let best = 0;
  let bestL = 0;
  let bestR = 0;

  frames.push(
    frame({
      id: "cw-start",
      title: "Start",
      note: "Two pointers start at both ends. Area = min(height[L], height[R]) × (R − L). Move the shorter side inward.",
      values,
      pointers: [
        { index: left, label: "L" },
        { index: right, label: "R" },
      ],
      vars: [
        { name: "best", value: "0" },
        { name: "area", value: "—" },
      ],
      truncated,
    }),
  );

  let step = 0;
  while (left < right) {
    const hl = heights[left]!;
    const hr = heights[right]!;
    const area = Math.min(hl, hr) * (right - left);
    if (area > best) {
      best = area;
      bestL = left;
      bestR = right;
    }
    frames.push(
      frame({
        id: `cw-${step++}`,
        title: `Area = ${area}`,
        note: `min(${hl}, ${hr}) × (${right} − ${left}) = ${area}. Best so far is ${best}. Move the pointer at the shorter height.`,
        values,
        states: {
          [left]: "active",
          [right]: "active",
          [bestL]: "matched",
          [bestR]: "matched",
        },
        pointers: [
          { index: left, label: "L" },
          { index: right, label: "R" },
        ],
        vars: [
          { name: "area", value: String(area) },
          { name: "best", value: String(best) },
        ],
        truncated,
      }),
    );
    if (hl <= hr) left += 1;
    else right -= 1;
  }

  frames.push(
    frame({
      id: "cw-done",
      title: "Max area found",
      note: `Maximum water area is ${best}, between indices ${bestL} and ${bestR}.`,
      values,
      states: { [bestL]: "matched", [bestR]: "matched" },
      pointers: [
        { index: bestL, label: "L*" },
        { index: bestR, label: "R*" },
      ],
      vars: [{ name: "result", value: String(best) }],
      truncated,
    }),
  );
  return frames;
}

function simulateSlidingWindow(spec: AlgoSpec): AlgoFrame[] {
  const { values, truncated } = cellValuesFromSpec(spec);
  const frames: AlgoFrame[] = [];
  const lastIndex = new Map<string, number>();
  let start = 0;
  let best = 0;
  let bestStart = 0;
  let bestEnd = -1;

  frames.push(
    frame({
      id: "sw-start",
      title: "Start",
      note: "Grow a window [start, i]. When a repeat appears inside the window, jump start past its previous index.",
      values,
      vars: [
        { name: "start", value: "0" },
        { name: "best", value: "0" },
      ],
      auxTitle: "Last seen index",
      auxRows: [],
      truncated,
    }),
  );

  for (let i = 0; i < values.length; i++) {
    const ch = values[i]!;
    const prev = lastIndex.get(ch);
    if (prev !== undefined && prev >= start) {
      frames.push(
        frame({
          id: `sw-${i}-shrink`,
          title: `Repeat '${ch}'`,
          note: `'${ch}' was last seen at index ${prev}, inside the window. Move start to ${prev + 1}.`,
          values,
          states: windowStates(start, i, { [i]: "active", [prev]: "pointer" }),
          pointers: [
            { index: start, label: "start" },
            { index: i, label: "i" },
          ],
          auxTitle: "Last seen index",
          auxRows: mapRows(lastIndex),
          vars: [
            { name: "start", value: String(start) },
            { name: "i", value: String(i) },
            { name: "window", value: values.slice(start, i + 1).join("") },
          ],
          truncated,
        }),
      );
      start = prev + 1;
    }

    lastIndex.set(ch, i);
    const len = i - start + 1;
    if (len > best) {
      best = len;
      bestStart = start;
      bestEnd = i;
    }

    frames.push(
      frame({
        id: `sw-${i}-grow`,
        title: `Window length ${len}`,
        note: `Include '${ch}' at index ${i}. Current window is "${values.slice(start, i + 1).join("")}" (length ${len}). Best = ${best}.`,
        values,
        states: windowStates(start, i),
        pointers: [
          { index: start, label: "start" },
          { index: i, label: "i" },
        ],
        auxTitle: "Last seen index",
        auxRows: mapRows(lastIndex),
        vars: [
          { name: "start", value: String(start) },
          { name: "i", value: String(i) },
          { name: "best", value: String(best) },
        ],
        truncated,
      }),
    );
  }

  const bestStates: Partial<Record<number, CellState>> = {};
  for (let i = bestStart; i <= bestEnd; i++) bestStates[i] = "matched";

  frames.push(
    frame({
      id: "sw-done",
      title: "Longest unique substring",
      note:
        bestEnd >= 0
          ? `Longest substring without repeating characters is "${values.slice(bestStart, bestEnd + 1).join("")}" (length ${best}).`
          : "Empty input.",
      values,
      states: bestStates,
      vars: [{ name: "result", value: String(best) }],
      auxTitle: "Last seen index",
      auxRows: mapRows(lastIndex),
      truncated,
    }),
  );
  return frames;
}

function windowStates(
  start: number,
  end: number,
  extra: Partial<Record<number, CellState>> = {},
): Partial<Record<number, CellState>> {
  const states: Partial<Record<number, CellState>> = { ...extra };
  for (let i = start; i <= end; i++) {
    if (!states[i]) states[i] = "window";
  }
  return states;
}

function mapRows(map: Map<string, number>): AlgoTableRow[] {
  return [...map.entries()].map(([key, value]) => ({
    key,
    value: String(value),
  }));
}

function simulateBinarySearch(spec: AlgoSpec): AlgoFrame[] {
  const { values, truncated } = cellValuesFromSpec(spec);
  const nums = values.map(Number);
  const target = spec.target ?? 0;
  const frames: AlgoFrame[] = [];
  let lo = 0;
  let hi = nums.length - 1;

  frames.push(
    frame({
      id: "bs-start",
      title: "Start",
      note: `Search for ${target} in a sorted array. Keep a [lo, hi] range and check the middle each step.`,
      values,
      pointers: [
        { index: lo, label: "lo" },
        { index: hi, label: "hi" },
      ],
      vars: [
        { name: "target", value: String(target) },
        { name: "lo", value: String(lo) },
        { name: "hi", value: String(hi) },
      ],
      truncated,
    }),
  );

  let step = 0;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    const midVal = nums[mid]!;
    const states: Partial<Record<number, CellState>> = { [mid]: "active" };
    for (let i = 0; i < values.length; i++) {
      if (i < lo || i > hi) states[i] = "discarded";
    }

    frames.push(
      frame({
        id: `bs-${step++}-mid`,
        title: `mid = ${mid}`,
        note: `mid = ${mid}, value ${midVal}. Compare with target ${target}.`,
        values,
        states,
        pointers: [
          { index: lo, label: "lo" },
          { index: mid, label: "mid" },
          { index: hi, label: "hi" },
        ],
        vars: [
          { name: "lo", value: String(lo) },
          { name: "mid", value: String(mid) },
          { name: "hi", value: String(hi) },
          { name: "nums[mid]", value: String(midVal) },
        ],
        truncated,
      }),
    );

    if (midVal === target) {
      frames.push(
        frame({
          id: `bs-found`,
          title: "Found",
          note: `nums[${mid}] = ${target}. Return index ${mid}.`,
          values,
          states: { ...states, [mid]: "matched" },
          pointers: [{ index: mid, label: "mid" }],
          vars: [{ name: "result", value: String(mid) }],
          truncated,
        }),
      );
      return frames;
    }

    if (midVal < target) {
      frames.push(
        frame({
          id: `bs-${step++}-right`,
          title: "Search right half",
          note: `${midVal} < ${target}, so discard indices ≤ mid. Set lo = ${mid + 1}.`,
          values,
          states: {
            ...states,
            ...Object.fromEntries(
              Array.from({ length: mid - lo + 1 }, (_, k) => [
                lo + k,
                "discarded" as CellState,
              ]),
            ),
          },
          pointers: [
            { index: mid + 1 <= hi ? mid + 1 : hi, label: "lo→" },
            { index: hi, label: "hi" },
          ],
          vars: [
            { name: "lo", value: String(mid + 1) },
            { name: "hi", value: String(hi) },
          ],
          truncated,
        }),
      );
      lo = mid + 1;
    } else {
      frames.push(
        frame({
          id: `bs-${step++}-left`,
          title: "Search left half",
          note: `${midVal} > ${target}, so discard indices ≥ mid. Set hi = ${mid - 1}.`,
          values,
          states: {
            ...states,
            ...Object.fromEntries(
              Array.from({ length: hi - mid + 1 }, (_, k) => [
                mid + k,
                "discarded" as CellState,
              ]),
            ),
          },
          pointers: [
            { index: lo, label: "lo" },
            { index: mid - 1 >= lo ? mid - 1 : lo, label: "←hi" },
          ],
          vars: [
            { name: "lo", value: String(lo) },
            { name: "hi", value: String(mid - 1) },
          ],
          truncated,
        }),
      );
      hi = mid - 1;
    }
  }

  frames.push(
    frame({
      id: "bs-miss",
      title: "Not found",
      note: `Range emptied without finding ${target}. Return -1.`,
      values,
      states: Object.fromEntries(
        values.map((_, i) => [i, "discarded" as CellState]),
      ),
      vars: [{ name: "result", value: "-1" }],
      truncated,
    }),
  );
  return frames;
}

function simulateStack(spec: AlgoSpec): AlgoFrame[] {
  const { values, truncated } = cellValuesFromSpec(spec);
  const frames: AlgoFrame[] = [];
  const stack: string[] = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const opens = new Set(["(", "[", "{"]);

  frames.push(
    frame({
      id: "st-start",
      title: "Start",
      note: "Scan left to right. Push opening brackets. On a closing bracket, the stack top must be its match.",
      values,
      auxTitle: "Stack (top at bottom)",
      auxRows: [],
      vars: [{ name: "stack", value: "[]" }],
      truncated,
    }),
  );

  for (let i = 0; i < values.length; i++) {
    const ch = values[i]!;
    if (opens.has(ch)) {
      stack.push(ch);
      frames.push(
        frame({
          id: `st-${i}-push`,
          title: `Push '${ch}'`,
          note: `'${ch}' is an opening bracket. Push it onto the stack.`,
          values,
          states: { [i]: "active" },
          pointers: [{ index: i, label: "i" }],
          auxTitle: "Stack (top at bottom)",
          auxRows: stackRows(stack),
          vars: [
            { name: "i", value: String(i) },
            { name: "stack", value: JSON.stringify(stack) },
          ],
          truncated,
        }),
      );
      continue;
    }

    const expected = pairs[ch];
    if (!expected) {
      frames.push(
        frame({
          id: `st-${i}-skip`,
          title: `Skip '${ch}'`,
          note: `'${ch}' is not a bracket character — ignore it for this problem.`,
          values,
          states: { [i]: "discarded" },
          pointers: [{ index: i, label: "i" }],
          auxTitle: "Stack (top at bottom)",
          auxRows: stackRows(stack),
          truncated,
        }),
      );
      continue;
    }

    const top = stack[stack.length - 1];
    if (top !== expected) {
      frames.push(
        frame({
          id: `st-${i}-fail`,
          title: "Mismatch",
          note: top
            ? `Closing '${ch}' expects '${expected}' on top, but found '${top}'. Invalid.`
            : `Closing '${ch}' with an empty stack. Invalid.`,
          values,
          states: { [i]: "active" },
          pointers: [{ index: i, label: "i" }],
          auxTitle: "Stack (top at bottom)",
          auxRows: stackRows(stack),
          vars: [{ name: "result", value: "false" }],
          truncated,
        }),
      );
      return frames;
    }

    stack.pop();
    frames.push(
      frame({
        id: `st-${i}-pop`,
        title: `Pop match for '${ch}'`,
        note: `'${ch}' matches '${expected}' on the stack. Pop and continue.`,
        values,
        states: { [i]: "matched" },
        pointers: [{ index: i, label: "i" }],
        auxTitle: "Stack (top at bottom)",
        auxRows: stackRows(stack),
        vars: [
          { name: "i", value: String(i) },
          { name: "stack", value: JSON.stringify(stack) },
        ],
        truncated,
      }),
    );
  }

  const ok = stack.length === 0;
  frames.push(
    frame({
      id: "st-done",
      title: ok ? "Valid" : "Leftover openings",
      note: ok
        ? "Stack is empty after the full scan. Every bracket was matched."
        : `Stack still has ${JSON.stringify(stack)}. Not all openings were closed.`,
      values,
      states: ok
        ? Object.fromEntries(values.map((_, i) => [i, "matched" as CellState]))
        : undefined,
      auxTitle: "Stack (top at bottom)",
      auxRows: stackRows(stack),
      vars: [{ name: "result", value: String(ok) }],
      truncated,
    }),
  );
  return frames;
}

function stackRows(stack: string[]): AlgoTableRow[] {
  return stack.map((ch, i) => ({
    key: String(i),
    value: ch,
  }));
}

const SIMULATORS: Record<AlgoPattern, (spec: AlgoSpec) => AlgoFrame[]> = {
  hash_map: simulateHashMap,
  two_pointers: simulateTwoPointers,
  sliding_window: simulateSlidingWindow,
  binary_search: simulateBinarySearch,
  stack: simulateStack,
};

export function simulateAlgo(spec: AlgoSpec): AlgoFrame[] {
  const frames = SIMULATORS[spec.pattern](spec);
  if (frames.length) return frames;
  const { values, truncated } = cellValuesFromSpec(spec);
  return [
    frame({
      id: "empty",
      title: "No steps",
      note: "Could not build visualization steps for this input.",
      values,
      truncated,
    }),
  ];
}
