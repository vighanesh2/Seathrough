import OpenAI from "openai";
import { getLlmConfig } from "@/lib/env";
import { formatIntakeAnswers } from "@/lib/experiment/systemDesign/answers";
import {
  applyDesignRepair,
  compileSystemDesign,
  designGaps,
  parseSystemDesignSpec,
  type SystemDesignSpec,
} from "@/lib/experiment/systemDesign/compile";
import type { IntakeAnswers } from "@/lib/experiment/systemDesign/sections";
import { sectionLabel } from "@/lib/experiment/systemDesign/sections";
import type { ExperimentLesson } from "@/lib/experiment/scene";

function optionalEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function drawingClient() {
  const openaiKey = optionalEnv("OPENAI_API_KEY");
  if (openaiKey) {
    return {
      client: new OpenAI({ apiKey: openaiKey }),
      model: optionalEnv("OPENAI_MODEL") ?? "gpt-4.1",
    };
  }
  const cfg = getLlmConfig();
  return {
    client: new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL }),
    model: cfg.model,
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return JSON.parse(fenced[1].trim());
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error("Model did not return JSON");
}

const SYSTEM = `You design a software system for a student looking at a whiteboard.
Use the student's answers. State those assumptions in Requirements.
Return ONLY JSON:
{
  "title": "short title",
  "sections": [
    { "id": "requirements|architecture|data-model|flows|scaling|reliability|security|observability|deployment",
      "say": "2-4 sentences: the decision and the tradeoff",
      "example": "the concrete artifact" }
  ],
  "boxes": [
    { "id": "kebab-id", "label": "short name", "column": "client|service|data" }
  ],
  "arrows": [ { "from": "id", "to": "id", "label": "optional" } ]
}

Include every section id exactly once, in that order.
example is required for architecture (the request path), data-model (tables), and flows (one request from send to delivery).
Other examples: how it scales, what happens when a dependency fails, auth and threats, what you measure, and where it runs.
boxes: 4-8 real components. Clients in client, services in service, stores in data. Labels under 22 characters. If a component does not apply, omit the box. Never label a box N/A, none, or not applicable.
Arrows only between box ids. No photos. JSON only.`;

async function complete(user: string): Promise<unknown> {
  const { client, model } = drawingClient();
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
  });
  const content = completion.choices[0]?.message?.content ?? "";
  if (!content.trim()) throw new Error("Empty system design from model");
  return extractJson(content);
}

async function repairSpec(spec: SystemDesignSpec, prompt: string): Promise<SystemDesignSpec> {
  const gaps = designGaps(spec);
  if (!gaps.length) return spec;
  const repaired = await complete(
    `Fill ONLY these sections for this system. Keep the same product.\nMissing: ${gaps.map(sectionLabel).join(", ")}\n\nProduct:\n${prompt}\n\nReturn JSON with a sections array. Each missing section needs say, and architecture, data-model, and flows also need example.`,
  );
  return applyDesignRepair(spec, repaired);
}

export async function generateSystemDesignLesson(
  prompt: string,
  answers: IntakeAnswers,
): Promise<ExperimentLesson> {
  const brief = `${prompt.trim()}\n\nStudent answers:\n${formatIntakeAnswers(answers)}`;
  const first = parseSystemDesignSpec(await complete(`Design this system:\n${brief}`));
  const spec = await repairSpec(first, brief);
  const gaps = designGaps(spec);
  if (gaps.length) {
    throw new Error(
      `System design is missing ${gaps.map(sectionLabel).join(", ")}.`,
    );
  }
  return compileSystemDesign(spec, prompt.trim(), answers.scale);
}
