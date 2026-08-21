import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  runImageExplainPipeline,
} from "@/lib/image-explain";
import type { ExtractPreference } from "@/lib/image-explain/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "Expected multipart form data with an image file." },
      { status: 400 },
    );
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return Response.json(
      { error: "Attach an image file under the field name \"image\"." },
      { status: 400 },
    );
  }

  const questionRaw = form.get("question");
  const question =
    typeof questionRaw === "string" ? questionRaw.trim().slice(0, 600) : "";

  const preferenceRaw = form.get("preference");
  const preference: ExtractPreference =
    preferenceRaw === "vision" || preferenceRaw === "ocr"
      ? preferenceRaw
      : "auto";

  const mimeType = (file.type || "application/octet-stream").toLowerCase();
  if (
    !(ALLOWED_IMAGE_MIME as readonly string[]).includes(mimeType) &&
    mimeType !== "image/jpg"
  ) {
    return Response.json(
      { error: "Unsupported image type. Upload PNG, JPEG, WebP, or GIF." },
      { status: 400 },
    );
  }

  if (file.size <= 0) {
    return Response.json({ error: "The uploaded image was empty." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Response.json(
      { error: "Image must be 4MB or smaller." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const result = await runImageExplainPipeline({
      bytes,
      mimeType,
      fileName: file.name,
      question: question || undefined,
      preference,
      signal: request.signal,
    });
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[image-explain-route]", message);
    const missingConfiguration = message.includes(
      "Missing required environment variable",
    );
    const badInput =
      /Unsupported image|empty|4MB|Unsupported/i.test(message);
    return Response.json(
      {
        error: missingConfiguration
          ? "The image explain service is not configured (need OPENAI_API_KEY or GROQ_API_KEY for vision)."
          : badInput
            ? message
            : "Could not read this screenshot with the vision model. Try again, or use OCR only for plain text.",
        retryable: !missingConfiguration && !badInput,
      },
      { status: missingConfiguration ? 503 : badInput ? 400 : 502 },
    );
  }
}
