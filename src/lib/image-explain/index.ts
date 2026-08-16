export {
  runImageExplainPipeline,
  assertValidImageUpload,
} from "@/lib/image-explain/pipeline";
export { buildLessonPromptFromScreenshot } from "@/lib/image-explain/lessonPrompt";
export {
  extractFromImage,
  resolveExtractAdapter,
  visionExtractAdapter,
  ocrExtractAdapter,
} from "@/lib/image-explain/extract";
export { explainExtraction } from "@/lib/image-explain/explain";
export type {
  ImageExplainResult,
  ImageExtraction,
  ImageExplanation,
  ImageExplainKind,
  ImageExtractEngine,
} from "@/lib/image-explain/types";
export {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  IMAGE_EXPLAIN_KINDS,
} from "@/lib/image-explain/types";
