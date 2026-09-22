/** Turn model-escaped control sequences into real characters. */
export function decodeBoardText(value: unknown): string {
  return String(value ?? "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "  ")
    .replace(/\r\n/g, "\n")
    .replace(/\u2028|\u2029/g, "\n");
}

export function looksLikeCode(text: string): boolean {
  const sample = decodeBoardText(text);
  if (
    /^[ \t]*(def |class |function |const |let |var |if |for |while |return |import )/m.test(
      sample,
    )
  ) {
    return true;
  }
  if (/:\n/.test(sample) && /\b(return|if|else|def)\b/.test(sample)) {
    return true;
  }
  return /[{};]/.test(sample) && /\n/.test(sample);
}

function tidyPythonish(text: string): string {
  const lines = decodeBoardText(text)
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""));
  const meaningful = lines.filter((line) => line.trim());
  if (!meaningful.length) return "";
  const alreadyIndented = meaningful.some((line) => /^[ \t]{2,}|\t/.test(line));
  if (alreadyIndented) {
    return lines
      .map((line) => line.trimEnd())
      .join("\n")
      .replace(/^\n+/, "")
      .replace(/\n+$/, "")
      .replace(/^[ \t]+(?=def |class |function )/, "");
  }

  let indent = 0;
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    if (/^(else|elif|except|finally)\b/.test(trimmed)) {
      indent = Math.max(0, indent - 1);
    }
    out.push(`${"  ".repeat(indent)}${trimmed}`);
    if (trimmed.endsWith(":")) indent += 1;
  }
  return out.join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
}

export function formatBoardText(value: unknown, max = 500): string {
  const decoded = decodeBoardText(value);
  if (looksLikeCode(decoded)) {
    return tidyPythonish(decoded).slice(0, max);
  }
  const lines = decoded
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").replace(/[ \t]+$/g, ""));
  while (lines.length && !lines[0]?.trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1]?.trim()) lines.pop();
  return lines.join("\n").slice(0, max);
}

export function clipSpeech(value: unknown, max: number): string {
  return formatBoardText(value, max)
    .replace(/\s+/g, " ")
    .trim();
}
