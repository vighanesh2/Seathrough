export const IMAGE_EXPLAIN_KINDS = [
  "problem",
  "diagram",
  "notes",
  "code",
  "table",
  "other",
] as const;

export type ImageExplainKind = (typeof IMAGE_EXPLAIN_KINDS)[number];

export const IMAGE_EXTRACT_ENGINES = ["vision", "ocr"] as const;
export type ImageExtractEngine = (typeof IMAGE_EXTRACT_ENGINES)[number];

export type ExtractedBlock = {
  text: string;
  /** Optional rough region hint from the extractor. */
  label?: string;
};

export type ImageExtraction = {
  engine: ImageExtractEngine;
  kind: ImageExplainKind;
  /** Full transcribed / OCR text. */
  text: string;
  blocks: ExtractedBlock[];
  /** 0–1 when known. */
  confidence?: number;
  /** Short label of what the image appears to be. */
  title: string;
};

export type ImageExplanation = {
  title: string;
  summary: string;
  steps: string[];
  concepts: string[];
  /** Suggested follow-up questions for the learner. */
  followUps: string[];
};

export type ImageExplainResult = {
  extraction: ImageExtraction;
  explanation: ImageExplanation;
  /** Prompt fed into the lesson whiteboard stream. */
  lessonPrompt?: string;
};

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
] as const;
