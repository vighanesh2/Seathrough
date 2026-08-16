import type { ImageExtraction } from "@/lib/image-explain/types";

export type ImageExtractInput = {
  bytes: Buffer;
  mimeType: string;
  fileName?: string;
  /** Optional learner hint (e.g. "explain this math problem"). */
  question?: string;
  signal?: AbortSignal;
};

/**
 * Pluggable extractor — swap vision / OCR without touching the UI or route.
 */
export type ImageExtractAdapter = {
  id: "vision" | "ocr";
  label: string;
  extract: (input: ImageExtractInput) => Promise<ImageExtraction>;
};

export function toDataUrl(bytes: Buffer, mimeType: string): string {
  const mime = mimeType === "image/jpg" ? "image/jpeg" : mimeType;
  return `data:${mime};base64,${bytes.toString("base64")}`;
}
