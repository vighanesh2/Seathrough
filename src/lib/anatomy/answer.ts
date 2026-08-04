import OpenAI from "openai";
import { getLlmConfig } from "@/lib/env";
import { anatomyModelAnswerSchema } from "@/lib/anatomy/schemas";
import {
  citationsForKnowledge,
  type AnatomyKnowledgeEntry,
} from "@/lib/anatomy/knowledge/cardiopulmonary";
import type {
  AnatomyAnswer,
  AnatomyAnimationMode,
  AnatomyStructureId,
} from "@/lib/anatomy/types";
import {
  ANATOMY_ANIMATION_MODES,
  ANATOMY_STRUCTURE_IDS,
} from "@/lib/anatomy/types";

function suggestedMode(entries: AnatomyKnowledgeEntry[]): AnatomyAnimationMode {
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.has("gas-exchange")) return "gas-exchange";
  if (ids.has("ventilation")) return "ventilation";
  if (ids.has("cardiac-cycle") || ids.has("valves")) return "cardiac-cycle";
  if (ids.has("left-heart")) return "systemic-outflow";
  if (ids.has("complete-blood-route") || ids.has("pulmonary-circuit")) {
    return "pulmonary-circulation";
  }
  return "overview";
}

function normalizeStructure(value: unknown): AnatomyStructureId | null {
  const raw =
    typeof value === "object" && value && "id" in value
      ? (value as { id?: unknown }).id
      : value;
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase().replace(/[\s_]+/g, "-");
  if ((ANATOMY_STRUCTURE_IDS as readonly string[]).includes(key)) {
    return key as AnatomyStructureId;
  }
  const aliases: Record<string, AnatomyStructureId> = {
    "right-atria": "right-atrium",
    "left-atria": "left-atrium",
    "pulmonary-artery": "pulmonary-trunk",
    "pulmonary-arteries": "pulmonary-trunk",
    "pulmonary-vein": "right-pulmonary-veins",
    "pulmonary-veins": "right-pulmonary-veins",
    lungs: "right-lung",
    bronchus: "main-bronchi",
    bronchi: "main-bronchi",
    "vena-cava": "superior-vena-cava",
  };
  return aliases[key] ?? null;
}

export function normalizeAnatomyModelAnswer(
  json: unknown,
  fallbackMode: AnatomyAnimationMode,
): unknown {
  if (!json || typeof json !== "object") return json;
  const outer = json as Record<string, unknown>;
  const value =
    outer.result && typeof outer.result === "object"
      ? (outer.result as Record<string, unknown>)
      : outer;
  const focusRaw =
    value.focusStructures ?? value.focus_structures ?? value.structures ?? [];
  const focusStructures = Array.isArray(focusRaw)
    ? focusRaw
        .map(normalizeStructure)
        .filter((structure): structure is AnatomyStructureId => Boolean(structure))
        .slice(0, 8)
    : [];
  const requestedMode =
    typeof (value.animationMode ?? value.animation_mode) === "string"
      ? String(value.animationMode ?? value.animation_mode)
      : fallbackMode;
  const animationMode = (
    ANATOMY_ANIMATION_MODES as readonly string[]
  ).includes(requestedMode)
    ? requestedMode
    : fallbackMode;
  const rawReveal = Number(value.reveal ?? 6);

  return {
    answer:
      value.answer ??
      value.explanation ??
      value.response ??
      value.text ??
      "",
    focusStructures,
    animationMode,
    reveal: Number.isFinite(rawReveal)
      ? Math.max(1, Math.min(6, Math.round(rawReveal)))
      : 6,
    supported: value.supported !== false,
  };
}

export async function generateGroundedAnatomyAnswer(input: {
  question: string;
  selectedStructure?: AnatomyStructureId | null;
  entries: AnatomyKnowledgeEntry[];
  signal?: AbortSignal;
}): Promise<AnatomyAnswer> {
  const citations = citationsForKnowledge(input.entries);
  if (!input.entries.length) {
    return {
      answer:
        "I do not have enough cardiopulmonary evidence in the reviewed source set to answer that question reliably. Try asking about normal heart chambers, valves, pulmonary blood flow, breathing, or alveolar gas exchange.",
      citations: [],
      focusStructures: input.selectedStructure
        ? [input.selectedStructure]
        : [],
      animationMode: "overview",
      reveal: 6,
      supported: false,
    };
  }

  const config = getLlmConfig();
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
  const evidence = input.entries
    .map(
      (entry, index) =>
        `[E${index + 1}] ${entry.title}\nStructures: ${entry.structureIds.join(", ")}\n${entry.excerpt}`,
    )
    .join("\n\n");
  const mode = suggestedMode(input.entries);

  const completion = await client.chat.completions.create(
    {
      model: config.model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You answer questions about the normal adult heart and lungs for an educational 3D app.
Use ONLY the supplied evidence. Do not add diagnoses, treatment advice, statistics, or unsupported mechanisms.
Explain direction and cause clearly. Correct common misconceptions directly.
If evidence is insufficient, set supported=false and say what the evidence cannot establish.
Return JSON only with:
{
  "answer": string,
  "focusStructures": string[],
  "animationMode": "overview" | "cardiac-cycle" | "pulmonary-circulation" | "systemic-outflow" | "ventilation" | "gas-exchange",
  "reveal": integer 1-6,
  "supported": boolean
}
focusStructures may use only structure IDs appearing in the evidence.`,
        },
        {
          role: "user",
          content: [
            `Question: ${input.question}`,
            input.selectedStructure
              ? `Currently selected structure: ${input.selectedStructure}`
              : "",
            `Preferred visualization mode when appropriate: ${mode}`,
            `Evidence:\n${evidence}`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    },
    { signal: input.signal },
  );

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("The anatomy answer provider returned no content.");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("The anatomy answer provider returned invalid JSON.");
  }
  const parsed = anatomyModelAnswerSchema.safeParse(
    normalizeAnatomyModelAnswer(json, mode),
  );
  if (!parsed.success) {
    throw new Error("The anatomy answer did not match the required schema.");
  }

  const allowedStructures = new Set(
    input.entries.flatMap((entry) => entry.structureIds),
  );
  const focusStructures = parsed.data.focusStructures.filter((structure) =>
    allowedStructures.has(structure),
  );

  return {
    ...parsed.data,
    focusStructures:
      focusStructures.length > 0
        ? focusStructures
        : input.entries[0]?.structureIds.slice(0, 4) ?? [],
    citations,
  };
}
