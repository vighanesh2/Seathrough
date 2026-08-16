import {
  extractFromImage,
  type ExtractPreference,
} from "@/lib/image-explain/extract";
import { buildLessonPromptFromScreenshot } from "@/lib/image-explain/lessonPrompt";
import type {
  ImageExplainResult,
  ImageExplanation,
} from "@/lib/image-explain/types";
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
} from "@/lib/image-explain/types";

export type ImageExplainPipelineInput = {
  bytes: Buffer;
  mimeType: string;
  fileName?: string;
  question?: string;
  preference?: ExtractPreference;
  /** When true, also generate a static card explanation (slower). Default false. */
  includeCardExplanation?: boolean;
  signal?: AbortSignal;
};

export type ImageExplainPipelineResult = ImageExplainResult & {
  lessonPrompt: string;
};

export function assertValidImageUpload(input: {
  bytes: Buffer;
  mimeType: string;
}): void {
  const mime = input.mimeType.toLowerCase();
  if (
    !(ALLOWED_IMAGE_MIME as readonly string[]).includes(mime) &&
    mime !== "image/jpg"
  ) {
    throw new Error(
      "Unsupported image type. Upload PNG, JPEG, WebP, or GIF.",
    );
  }
  if (!input.bytes.length) {
    throw new Error("The uploaded image was empty.");
  }
  if (input.bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 4MB or smaller.");
  }
}

/**
 * Modular pipeline: extract (vision/OCR) → lesson prompt for the whiteboard.
 */
export async function runImageExplainPipeline(
  input: ImageExplainPipelineInput,
): Promise<ImageExplainPipelineResult> {
  assertValidImageUpload(input);

  const extraction = await extractFromImage(
    {
      bytes: input.bytes,
      mimeType: input.mimeType,
      fileName: input.fileName,
      question: input.question,
      signal: input.signal,
    },
    input.preference ?? "auto",
  );

  const lessonPrompt = buildLessonPromptFromScreenshot({
    extraction,
    question: input.question,
  });

  let explanation: ImageExplanation = {
    title: extraction.title,
    summary:
      "Opening the whiteboard to teach this screenshot step by step.",
    steps: ["Extracted the problem from the image", "Teaching on the board"],
    concepts: [extraction.kind],
    followUps: [],
  };

  if (input.includeCardExplanation) {
    const { explainExtraction } = await import("@/lib/image-explain/explain");
    explanation = await explainExtraction({
      extraction,
      question: input.question,
      signal: input.signal,
    });
  }

  return { extraction, explanation, lessonPrompt };
}
