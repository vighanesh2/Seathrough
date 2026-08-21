import { z } from "zod";
import type { SceneBeat, SceneProgram } from "@/lib/scene-explain/types";

const beatSchema = z.object({
  order: z.coerce.number().int().min(1).max(12),
  narration: z.string().trim().min(1).max(400),
  reveal: z.coerce.number().int().min(1).max(12).optional(),
});

const metaSchema = z.object({
  title: z.string().trim().min(1).max(80),
  maxReveal: z.coerce.number().int().min(1).max(12).optional(),
  beats: z.array(beatSchema).min(1).max(10),
  code: z.string().optional(),
});

function fence(raw: string, lang: string): string | null {
  const re = new RegExp("```" + lang + "\\s*([\\s\\S]*?)```", "i");
  const match = raw.match(re);
  return match?.[1]?.trim() || null;
}

function extractJsonObject(raw: string): unknown | null {
  const fenced = fence(raw, "json");
  const text = fenced ?? raw;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function splitLabeled(raw: string): { json?: string; code?: string } {
  const codeSplit = raw.split(/===CODE===/i);
  if (codeSplit.length < 2) {
    return { json: raw };
  }
  const head = codeSplit[0] ?? "";
  const code = codeSplit.slice(1).join("===CODE===").trim();
  const jsonPart = head.split(/===JSON===/i).pop()?.trim();
  return { json: jsonPart, code };
}

function normalizeBeats(
  beats: Array<{ order: number; narration: string; reveal?: number }>,
  maxReveal: number,
): SceneBeat[] {
  return beats
    .map((beat, i) => ({
      order: beat.order || i + 1,
      narration: beat.narration.trim(),
      reveal: Math.min(maxReveal, Math.max(1, beat.reveal ?? beat.order ?? i + 1)),
    }))
    .filter((beat) => beat.narration)
    .sort((a, b) => a.order - b.order)
    .slice(0, 10);
}

/**
 * Turn messy LLM output into a runnable program.
 * Accepts labeled sections, fenced blocks, or a JSON object with a code field.
 */
export function parseSceneProgram(raw: string): SceneProgram {
  if (!raw.trim()) {
    throw new Error("The scene planner returned an empty response.");
  }

  const labeled = splitLabeled(raw);
  let metaJson = labeled.json ? extractJsonObject(labeled.json) : null;
  if (!metaJson) metaJson = extractJsonObject(raw);

  const parsed = metaSchema.safeParse(metaJson);
  if (!parsed.success) {
    throw new Error("The scene planner did not return a usable title and explanation.");
  }

  const fencedJs = fence(raw, "javascript") ?? fence(raw, "js") ?? fence(raw, "ts");
  const code = (labeled.code || parsed.data.code || fencedJs || "").trim();
  if (!code) {
    throw new Error("The scene planner did not return Three.js code.");
  }

  const maxReveal = parsed.data.maxReveal ?? Math.max(parsed.data.beats.length, 3);
  const beats = normalizeBeats(parsed.data.beats, maxReveal);
  if (!beats.length) {
    throw new Error("The scene planner did not return an explanation.");
  }

  return {
    title: parsed.data.title.slice(0, 80),
    maxReveal,
    beats,
    code,
  };
}

export function parseRepairedCode(raw: string, fallbackTitle: string): string {
  if (!raw.trim()) {
    throw new Error("The fixer returned an empty scene.");
  }
  const labeled = splitLabeled(raw);
  if (labeled.code?.trim()) return labeled.code.trim();
  const fenced = fence(raw, "javascript") ?? fence(raw, "js");
  if (fenced) return fenced;
  const asProgram = extractJsonObject(raw);
  const parsed = metaSchema.safeParse(asProgram);
  if (parsed.success && parsed.data.code?.trim()) {
    return parsed.data.code.trim();
  }
  // Last resort: treat the whole reply as code if it looks like Three.js.
  if (/\bTHREE\b/.test(raw) && !raw.trim().startsWith("{")) {
    return raw.trim();
  }
  throw new Error(`Could not read a repaired scene for ${fallbackTitle}.`);
}
