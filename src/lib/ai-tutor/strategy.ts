import { clip, tutorComplete } from "@/lib/ai-tutor/llm";

const SWITCH_BELOW = 70;

const SWITCH_PROMPT = `You are the strategy thinker for a visual lesson. The last method did not get understanding to 70%.
Think, then pick a BETTER method. You MUST change. Do not keep or rename the same picture.

Think: <2-4 sentences: what the last visual showed, why it didn't land, what picture would work better>
Decision: change
Method: <short new name — not the same as Current or Tried>
Representation: <concrete objects and motion to draw for THIS topic, not a generic template>
Why switch: <one sentence>
Ask next: <one check question that fits the new picture>

Rules:
- If understanding is under 70, Decision must be change.
- Change the representation (number trace, causal chain, step sequence, analogy, before/after, call stack). Split-pane contrast is banned.
- Name objects from the topic. Do not invent a mix-up the student never stated.
- Do not lecture. The visual lesson will draw this.
`;

const CHOOSE_PROMPT = `You are picking the FIRST visual for this topic.
Think, then output the best first picture.

Think: <2-4 sentences: how the idea actually works, what objects to draw>
Decision: start
Method: <short name>
Representation: <concrete objects and motion for THIS topic>
Why this: <one sentence>
Ask next: <one check question>

Rules:
- Show the true mechanism. Do not invent a mix-up if Wrong model is none.
- For recursion / self-calling functions: nested call-stack frames that grow, then unwind with return values.
- No split-pane of "what you think" vs "what's true".
- Do not lecture. The visual lesson will draw this.
`;

export const DEFAULT_METHOD = `Method: mechanism in motion
Representation: one full scene of how the idea actually works; Play walks the real steps`;

const METHOD_BANK = [
  DEFAULT_METHOD,
  `Method: call stack
Representation: nested labeled frames push as calls happen, then unwind with return values`,
  `Method: single-object before/after
Representation: one object transforms as Play runs; no second-pane story`,
  `Method: step sequence
Representation: three numbered beats of the mechanism; Play walks through them in order`,
  `Method: concrete analogy
Representation: an everyday object with the same causal structure, then map it back to the idea`,
  `Method: counterexample
Representation: a case where the mix-up predicts the wrong outcome, shown as Play runs`,
  `Method: number trace
Representation: two or three changing quantities with labels; no metaphor`,
  `Method: causal chain
Representation: arrows of cause (energy, force, information) with no want, goal, or purpose`,
];

export function parseMethod(raw: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of (raw || "").split("\n")) {
    if (!line.includes(":")) continue;
    const idx = line.indexOf(":");
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    fields[key] = value;
  }
  return fields;
}

export function methodKey(raw: string): string {
  const name =
    parseMethod(raw).method ||
    (raw || "").trim().split("\n")[0] ||
    "";
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

export function sameMethod(left: string, right: string): boolean {
  const a = methodKey(left);
  const b = methodKey(right);
  return Boolean(a) && a === b;
}

export function methodLabel(raw: string): string {
  return parseMethod(raw).method || clip(raw, 48);
}

export function thinkText(raw: string): string {
  return parseMethod(raw).think || "";
}

export function needsChange(score: number | null | undefined, current = ""): boolean {
  if (!(current || "").trim()) return false;
  if (score == null) return true;
  return Number(score) < SWITCH_BELOW;
}

export function defaultMethod(diagnosis = ""): string {
  let topic = "";
  for (const line of (diagnosis || "").split("\n")) {
    if (line.toLowerCase().startsWith("topic:")) {
      topic = line.split(":").slice(1).join(":").trim();
      break;
    }
  }
  if (!topic) return DEFAULT_METHOD;
  return `${DEFAULT_METHOD}\nWhy this first: show how ${topic} actually works.`;
}

export function fallbackSwitch(current: string, tried: string[] = []): string {
  const used = new Set<string>([methodKey(current)]);
  for (const item of tried) {
    const key = methodKey(item);
    if (key) used.add(key);
  }
  for (const option of METHOD_BANK) {
    if (!used.has(methodKey(option))) return option;
  }
  return `Method: invert the last picture
Representation: keep the topic but reverse the failed story — start from the true model and show where the mix-up would break`;
}

async function completeMethod(
  system: string,
  payload: Record<string, unknown>,
): Promise<string> {
  try {
    const raw = await tutorComplete(system, JSON.stringify(payload), {
      maxTokens: 420,
      temperature: 0.45,
    });
    const text = (raw || "").trim();
    if (!/Method:/i.test(text)) return "";
    return text;
  } catch {
    return "";
  }
}

export async function choose(
  diagnosis = "",
  student = "",
): Promise<string> {
  const text = await completeMethod(CHOOSE_PROMPT, {
    diagnosis: clip(diagnosis, 900),
    student: clip(student, 400),
  });
  if (text && parseMethod(text).method) return text;
  return defaultMethod(diagnosis);
}

export async function switchMethod(
  current: string,
  options: {
    diagnosis?: string;
    tried?: string[];
    whyFailed?: string;
    score?: number | null;
    student?: string;
  } = {},
): Promise<string> {
  const text = (current || "").trim();
  if (!text) {
    throw new Error("No current teaching method. Pass the method that just failed.");
  }
  const triedList = (options.tried || []).filter((item) => item.trim());
  let nxt = await completeMethod(SWITCH_PROMPT, {
    current_method: clip(text, 900),
    diagnosis: clip(options.diagnosis || "", 800),
    why_failed: clip(options.whyFailed || "", 400),
    understanding: options.score ?? "unknown",
    must_change: true,
    student: clip(options.student || "", 400),
    tried: triedList.slice(-6).map((item) => clip(item, 240)),
  });
  if (
    !nxt ||
    sameMethod(text, nxt) ||
    triedList.some((item) => sameMethod(nxt, item))
  ) {
    nxt = fallbackSwitch(text, triedList);
    const why =
      options.whyFailed ||
      "the last picture did not raise understanding above 70%";
    nxt = `Think: Understanding is ${options.score ?? "low"}%. ${why}. Drop ${methodLabel(text)} and use a different representation.
Decision: change
${nxt}`;
  }
  return nxt;
}
