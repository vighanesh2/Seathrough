import { ocrExtractAdapter } from "@/lib/image-explain/extract/ocr";
import { visionExtractAdapter } from "@/lib/image-explain/extract/vision";
import type {
  ImageExtractAdapter,
  ImageExtractInput,
} from "@/lib/image-explain/extract/types";
import type { ImageExtraction } from "@/lib/image-explain/types";
import { envPresence } from "@/lib/env";

export type { ImageExtractAdapter, ImageExtractInput } from "@/lib/image-explain/extract/types";
export { visionExtractAdapter } from "@/lib/image-explain/extract/vision";
export { ocrExtractAdapter } from "@/lib/image-explain/extract/ocr";

export type ExtractPreference = "auto" | "vision" | "ocr";

function visionAvailable(): boolean {
  const env = envPresence();
  // Vision uses OpenAI when set, otherwise Groq vision model with GROQ key.
  return env.OPENAI_API_KEY || env.GROQ_API_KEY;
}

/**
 * Resolve which extractor to use. Prefer vision; fall back to OCR.
 */
export function resolveExtractAdapter(
  preference: ExtractPreference = "auto",
): ImageExtractAdapter {
  if (preference === "ocr") return ocrExtractAdapter;
  if (preference === "vision") return visionExtractAdapter;
  return visionAvailable() ? visionExtractAdapter : ocrExtractAdapter;
}

/**
 * Run extraction with automatic vision → OCR fallback only when vision
 * cannot run at all (no API keys). Do NOT fall back after a vision API
 * failure — OCR silently destroys math screenshots.
 */
export async function extractFromImage(
  input: ImageExtractInput,
  preference: ExtractPreference = "auto",
): Promise<ImageExtraction> {
  if (preference === "ocr") {
    return ocrExtractAdapter.extract(input);
  }

  if (preference === "vision" || visionAvailable()) {
    return visionExtractAdapter.extract(input);
  }

  // No vision keys configured — OCR is the only option.
  return ocrExtractAdapter.extract(input);
}
