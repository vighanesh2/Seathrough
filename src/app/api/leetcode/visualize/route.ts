import { classifyAlgoPrompt } from "@/lib/leetcode/classify";
import { leetcodeVisualizeRequestSchema } from "@/lib/leetcode/schemas";
import { simulateAlgo } from "@/lib/leetcode/simulate";
import { ALGO_PATTERN_LABELS } from "@/lib/leetcode/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = leetcodeVisualizeRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Enter a LeetCode-style prompt between 1 and 4000 characters.",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const spec = await classifyAlgoPrompt(parsed.data.prompt, request.signal);
    const frames = simulateAlgo(spec);

    if (!spec.supported && frames.length <= 1) {
      return Response.json({
        spec,
        frames,
        hint: `Could not confidently recognize this problem. Supported patterns: ${Object.values(ALGO_PATTERN_LABELS).join(", ")}.`,
      });
    }

    return Response.json(
      { spec, frames },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[leetcode-visualize-route]", message);
    const missingConfiguration = message.includes(
      "Missing required environment variable",
    );
    return Response.json(
      {
        error: missingConfiguration
          ? "The LeetCode visualizer is not configured."
          : "The LeetCode visualizer is temporarily unavailable.",
        retryable: !missingConfiguration,
      },
      { status: missingConfiguration ? 503 : 502 },
    );
  }
}
