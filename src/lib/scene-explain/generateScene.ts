import OpenAI from "openai";
import { getLlmConfig } from "@/lib/env";
import {
  builtinSceneForPrompt,
  fallbackSceneForPrompt,
} from "@/lib/scene-explain/builtinScenes";
import { parseSceneProgram } from "@/lib/scene-explain/parseProgram";
import { GENERATE_SYSTEM } from "@/lib/scene-explain/prompts";
import type { SceneGenerateInput, SceneProgram } from "@/lib/scene-explain/types";

function userMessage(input: SceneGenerateInput): string {
  const parts = [`Student request:\n${input.prompt.trim()}`];
  if (input.priorTitle) {
    parts.push(`A scene is already up: "${input.priorTitle}". Rebuild or extend it to answer this request.`);
  }
  if (input.priorSummary) {
    parts.push(`What we already explained:\n${input.priorSummary.slice(0, 800)}`);
  }
  parts.push(
    "Build a 3D process the student can watch. If they asked osmosis, show water crossing a membrane. If they asked matrix multiplication, show numbered matrices and the row-column product. If they asked something else, invent a clear physical model of THAT process.",
  );
  return parts.join("\n\n");
}

export async function generateSceneProgram(
  input: SceneGenerateInput,
): Promise<SceneProgram> {
  const prompt = input.prompt.trim();
  if (!prompt) {
    throw new Error("Prompt is required");
  }
  if (prompt.length > 600) {
    throw new Error("Prompt is too long");
  }

  // Known topics (osmosis, etc.) skip the planner unless this is a follow-up.
  if (!input.priorTitle && !input.priorSummary) {
    const known = builtinSceneForPrompt(prompt);
    if (known) return known;
  }

  try {
    return await requestProgram(input, true);
  } catch {
    try {
      return await requestProgram(input, false);
    } catch {
      return fallbackSceneForPrompt(prompt);
    }
  }
}

async function requestProgram(
  input: SceneGenerateInput,
  jsonMode: boolean,
): Promise<SceneProgram> {
  const { apiKey, model, baseURL } = getLlmConfig();
  const client = new OpenAI({ apiKey, baseURL });
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    messages: [
      { role: "system", content: GENERATE_SYSTEM },
      { role: "user", content: userMessage(input) },
    ],
  });

  return parseSceneProgram(completion.choices[0]?.message?.content ?? "");
}
