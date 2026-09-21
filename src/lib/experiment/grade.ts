export type GradeVerdict = "continue" | "simplify" | "revisit";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(" ").filter((part) => part.length > 1));
}

/**
 * Local first-pass grade so a clearly right answer does not wait on the LLM.
 */
export function gradeAnswer(
  answer: string,
  expect: string,
): GradeVerdict | "uncertain" {
  const a = normalize(answer);
  const e = normalize(expect);
  if (!a) return "simplify";
  if (!e) return "uncertain";
  if (a === e) return "continue";
  if (a.length >= 6 && e.includes(a)) return "continue";
  if (e.length >= 6 && a.includes(e)) return "continue";

  const aTok = tokens(a);
  const eTok = tokens(e);
  if (!eTok.size) return "uncertain";
  let hit = 0;
  for (const token of eTok) {
    if (aTok.has(token)) hit += 1;
  }
  const overlap = hit / eTok.size;
  if (overlap >= 0.7) return "continue";
  if (overlap >= 0.35) return "revisit";
  if (a.length >= 20) return "uncertain";
  if (a.length < 8) return "simplify";
  return "uncertain";
}
