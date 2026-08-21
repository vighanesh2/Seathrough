import { MAX_SCENE_CODE_CHARS } from "@/lib/scene-explain/types";

const FORBIDDEN: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bfetch\s*\(/i, reason: "Network calls are not allowed in the scene." },
  {
    pattern: /\bXMLHttpRequest\b|\bWebSocket\b|\bEventSource\b/i,
    reason: "Network APIs are not allowed in the scene.",
  },
  {
    pattern: /\bimport\s*\(|\bimport\s+["']|\brequire\s*\(/i,
    reason: "Imports are not allowed — use the THREE argument only.",
  },
  {
    pattern: /\beval\s*\(|\bnew\s+Function\b|\bFunction\s*\(/,
    reason: "Dynamic code evaluation is not allowed.",
  },
  {
    pattern: /\bdocument\.(cookie|write|writeln)\b|\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/i,
    reason: "Browser storage and document writes are not allowed.",
  },
  {
    pattern: /\bwindow\.(parent|top|opener)\b|\blocation\s*=/i,
    reason: "The scene cannot reach the parent page.",
  },
  {
    pattern: /\b(TextureLoader|FileLoader|ImageLoader|AudioLoader|GLTFLoader|DRACOLoader)\b/,
    reason: "External loaders are not allowed. Build geometry in code.",
  },
  {
    pattern: /<\/script/i,
    reason: "Script breakouts are not allowed.",
  },
];

export type InspectResult =
  | { ok: true }
  | { ok: false; reason: string };

export function inspectSceneCode(code: string): InspectResult {
  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: false, reason: "The scene code was empty." };
  }
  if (trimmed.length > MAX_SCENE_CODE_CHARS) {
    return { ok: false, reason: "The scene code was too large to run safely." };
  }
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(trimmed)) {
      return { ok: false, reason: rule.reason };
    }
  }
  return { ok: true };
}
