import OpenAI from "openai";
import { getLlmConfig } from "@/lib/env";
import {
  lessonPlanSchema,
  type LessonPlanParsed,
} from "@/lib/schemas/lesson";
import { listAssetIdsForPrompt } from "@/lib/visuals/router";

const ASSETS = listAssetIdsForPrompt();

const SYSTEM_PROMPT = `You are the lesson planner for Visual Education.
Voice is Deepgram TTS. You plan beats only.

CRITICAL visual rules (the server will REJECT unrelated assets):
1. ALWAYS include a drawable figure. Formulas alone are not enough — put equations in "formula" beside a figure.
2. NEVER invent quirky metaphors (e.g. Pythagoras ≠ horse rider, SDLC ≠ green loop doodle unless they asked for a programming loop).
3. For math: prefer template (right-triangle / hexagon) or mafs, AND set formula (e.g. "a^2 + b^2 = c^2"). Do NOT use katex-only.
4. For OOP class: use assetId "class-blueprint" (template → instances). NEVER classroom.
5. Templates are allowed ONLY when the prompt is clearly about that object / approved metaphor.
6. mermaid ONLY when the user asked for a flowchart / process / life-cycle diagram.
7. For other topics with no template: use rough (server builds a sketch). Never leave the board empty.

LEFT board renderers:
- template → curated SVG (must match prompt) + optional formula
- mafs → coordinate graphs + optional formula
- mermaid → flowcharts / processes the user asked for
- rough → hand-drawn sketch (preferred fallback)
- katex → discouraged; prefer formula overlay on a figure instead

Return ONLY valid JSON:
{
  "title": string,
  "language": string,
  "beats": [
    {
      "id": string,
      "order": number,
      "kind": "intro" | "token" | "visual_shift" | "recap" | "human_summary",
      "codeDelta": string (optional),
      "highlight": string (optional),
      "narration": string,
      "conceptKey": string (optional),
      "cognitiveType": "definition" | "structural" | "process" | "hidden_state",
      "visual": {
        "renderer": "template" | "katex" | "mermaid" | "mafs" | "rough",
        "assetId": string (optional),
        "source": string (optional),
        "formula": string (optional),
        "actions": []
      },
      "imageAction": "generate" | "keep" | "retire" | "none"
    }
  ],
  "humanSummary": string
}

Allowed template assetIds (use ONLY if prompt matches):
${ASSETS}

Examples:
- "Pythagoras theorem" → visual { renderer:"template", assetId:"right-triangle", formula:"a^2 + b^2 = c^2", actions:[{type:"draw"},{type:"label",anchor:"a",text:"a"},{type:"label",anchor:"b",text:"b"},{type:"label",anchor:"c",text:"c"}] }
- "horseriding" → horse-rider ONLY
- "java class" → classroom-blueprint
- "photosynthesis flowchart" → mermaid flowchart TD
- "what is photosynthesis" → rough (not mermaid unless they asked for a flowchart)
- Do NOT narrate unrelated stories just to force a fancy picture.

Other rules:
- kind MUST be intro|token|visual_shift|recap|human_summary
- humanSummary = learner thinking, never AI chain-of-thought
- Prefer 5–10 short beats
- First visual beat: imageAction generate; later same figure: keep`;

function normalizePlanInput(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;
  const plan = json as Record<string, unknown>;
  const beats = Array.isArray(plan.beats) ? plan.beats : [];

  plan.beats = beats.map((raw, index) => {
    if (!raw || typeof raw !== "object") return raw;
    const beat = { ...(raw as Record<string, unknown>) };
    if (beat.id == null) beat.id = `beat-${index + 1}`;
    if (beat.order == null) beat.order = index + 1;
    if (typeof beat.narration !== "string" || !beat.narration.trim()) {
      beat.narration = "Continuing the lesson.";
    }
    if (beat.imageAction == null || beat.imageAction === "") {
      beat.imageAction = beat.visual ? "generate" : "keep";
    }
    if (!Array.isArray(beat.actions)) beat.actions = [];
    return beat;
  });

  if (typeof plan.language !== "string" || !plan.language.trim()) {
    plan.language = "general";
  }
  if (typeof plan.title !== "string" || !plan.title.trim()) {
    plan.title = "Lesson";
  }
  if (typeof plan.humanSummary !== "string" || !plan.humanSummary.trim()) {
    plan.humanSummary =
      "I break the idea into small pieces, picture the simple figure, then name each part.";
  }

  return plan;
}

export async function generateLessonPlan(prompt: string): Promise<LessonPlanParsed> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("Prompt is empty");
  }

  const config = getLlmConfig();
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  const completion = await client.chat.completions.create({
    model: config.model,
    temperature: 0.25,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Create a Visual Education lesson for:\n\n${trimmed}\n\nUse only simple, directly relevant visuals. No invented metaphors.`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("LLM returned an empty lesson plan");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("LLM returned invalid JSON for lesson plan");
  }

  const normalized = normalizePlanInput(json);
  const parsed = lessonPlanSchema.safeParse(normalized);
  if (!parsed.success) {
    throw new Error(
      `Lesson plan failed validation: ${parsed.error.issues
        .slice(0, 6)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  return parsed.data;
}
