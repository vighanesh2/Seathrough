/**
 * Flowchart / Mermaid helpers — prefer real process diagrams over
 * loop-cycle templates and junk fallback graphs.
 */

const JUNK_FALLBACK =
  /A\[Start\]\s*-->\s*B\[Learn\]\s*-->\s*C\[Practice\]/i;

export function wantsFlowchart(text: string): boolean {
  const t = text.toLowerCase();
  if (/\b(flow\s*chart|flowchart|flow-diagram|mermaid)\b/.test(t)) return true;
  if (/\b(sdlc|software development life\s*cycle)\b/.test(t)) return true;
  if (/\bphotosynthesis\b/.test(t) && /\b(flow|diagram|process|chart)\b/.test(t)) {
    return true;
  }
  if (/\blife\s*cycle\b/.test(t) && /\b(flow|diagram|chart|stages?|process)\b/.test(t)) {
    return true;
  }
  return false;
}

/** True when "cycle" means SDLC/life-cycle, not a programming loop */
export function isLifecycleContext(text: string): boolean {
  const t = text.toLowerCase();
  return /\b(life\s*cycle|lifecycle|sdlc|water cycle|carbon cycle|rock cycle)\b/.test(
    t,
  );
}

export function isProgrammingLoopContext(text: string): boolean {
  const t = text.toLowerCase();
  if (isLifecycleContext(t)) return false;
  return /\b(for-?loop|while-?loop|for loop|while loop|iteration|iterate|programming loop)\b/.test(
    t,
  );
}

export function isJunkMermaidSource(source: string | undefined): boolean {
  if (!source?.trim()) return true;
  return JUNK_FALLBACK.test(source.replace(/\s+/g, " "));
}

/** Build a clean topic flowchart when the model omits / sends junk Mermaid */
export function buildFlowchartFromPrompt(prompt: string): string {
  const t = prompt.toLowerCase();

  if (/\bphotosynthesis\b/.test(t)) {
    return [
      "flowchart TD",
      "  S[Sunlight] --> W[Water]",
      "  W --> C[Carbon Dioxide]",
      "  C --> G[Glucose]",
      "  G --> O[Oxygen]",
    ].join("\n");
  }

  if (/\b(sdlc|software development|life\s*cycle)\b/.test(t)) {
    return [
      "flowchart TD",
      "  P[Planning] --> A[Analysis]",
      "  A --> D[Design]",
      "  D --> I[Implementation]",
      "  I --> T[Testing]",
      "  T --> M[Maintenance]",
    ].join("\n");
  }

  // Generic readable vertical flow — never Start/Learn/Practice
  return [
    "flowchart TD",
    "  A[Start] --> B[Step 1]",
    "  B --> C[Step 2]",
    "  C --> D[Result]",
  ].join("\n");
}

/** Prefer TD layout; strip junk; ensure flowchart header */
export function normalizeMermaidSource(
  source: string | undefined,
  prompt: string,
): string {
  if (isJunkMermaidSource(source)) {
    return buildFlowchartFromPrompt(prompt);
  }

  let src = source!.trim();
  // Promote cramped LR chains with many nodes to TD for cleaner tldraw layout
  const nodeCount = (src.match(/\[[^\]]+\]/g) ?? []).length;
  if (/^flowchart\s+LR\b/i.test(src) && nodeCount >= 4) {
    src = src.replace(/^flowchart\s+LR\b/i, "flowchart TD");
  }
  if (!/^(flowchart|graph|sequenceDiagram|mindmap|stateDiagram)/i.test(src)) {
    src = `flowchart TD\n${src}`;
  }
  return src;
}
