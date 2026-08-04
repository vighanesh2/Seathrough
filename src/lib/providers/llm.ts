import OpenAI from "openai";
import { getLlmConfig } from "@/lib/env";
import {
  lessonPlanSchema,
  type LessonPlanParsed,
} from "@/lib/schemas/lesson";
import { listAssetIdsForPrompt } from "@/lib/visuals/router";
import { threeSceneCatalogForPrompt } from "@/lib/three-scenes/decide";
import { retrieveCardiopulmonaryKnowledge } from "@/lib/anatomy/knowledge/cardiopulmonary";
import type { AnatomyStructureId } from "@/lib/anatomy/types";

const ASSETS = listAssetIdsForPrompt();
const THREE_SCENES = threeSceneCatalogForPrompt();

function selectedAnatomyStructure(
  visualSummary?: string,
): AnatomyStructureId | undefined {
  const selected = visualSummary?.match(/\bselected=([a-z-]+)/)?.[1];
  return selected as AnatomyStructureId | undefined;
}

function cardiopulmonaryEvidence(
  question: string,
  visualSummary?: string,
): string {
  const selected = selectedAnatomyStructure(visualSummary);
  const sceneIsActive = visualSummary?.includes("scene=cardiopulmonary");
  const entries = retrieveCardiopulmonaryKnowledge(
    question,
    sceneIsActive ? selected : undefined,
    4,
  );
  if (!entries.length) return "";
  return entries
    .map(
      (entry, index) =>
        `[Cardiopulmonary evidence ${index + 1}: ${entry.title}]\n${entry.excerpt}`,
    )
    .join("\n\n");
}

const SYSTEM_PROMPT = `You are the lesson planner for SeeThrough.
Voice is Deepgram TTS. You plan beats only.

CRITICAL visual rules (the server will REJECT unrelated assets):
1. ALWAYS include a drawable figure. Formulas alone are not enough — put equations in "formula" beside a figure.
2. NEVER invent quirky metaphors (e.g. SDLC ≠ green loop doodle unless they asked for a programming loop).
3. For math: prefer board teaching with a formula beside a figure (rough or mafs). Do NOT use katex-only. Do NOT force a fixed Pythagoras triangle template.
4. For OOP class: use assetId "class-blueprint" (template → instances). NEVER classroom.
5. Templates are allowed ONLY when the prompt is clearly about that object / approved metaphor.
6. mermaid ONLY when the user asked for a flowchart / process / life-cycle diagram.
7. For other topics with no template: use rough (server builds a sketch). Never leave the board empty.

INTERACTIVE 3D (Three.js) — YOU decide, do not rely on keyword lists:
- Set top-level "threeScene" when an interactive spatial model helps the student more than flat text/drawing.
- Use 3D for: organs, anatomy, planets/orbits, atoms, waves, molecules, forces/vectors, geometry in space, machines, cells.
- Do NOT use 3D for: pure definitions, coding syntax, UML, history essays, vocabulary-only lessons.
- When use=true, pick id from this catalog ONLY: ${THREE_SCENES}
- For heart pumping, chambers, valves, blood flow, lungs, breathing, pulmonary circulation, or gas exchange, use id "cardiopulmonary". The legacy "heart" id is restore-only.
- For cardiopulmonary lessons, teach flow in anatomical order and distinguish pulmonary arteries (away from the heart, oxygen-poor) from pulmonary veins (toward the heart, oxygen-rich).
- If nothing fits but 3D still helps, use id "generic".
- When use=false or not needed, set threeScene to null.

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
  "threeScene": null | { "use": true, "id": string, "title": string },
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
- "horseriding" → horse-rider ONLY; threeScene null
- "java class" → class-blueprint; threeScene null
- "how does the heart pump blood" → threeScene { use:true, id:"cardiopulmonary", title:"Heart and lungs" }
- "how does the solar system orbit" → threeScene { use:true, id:"solar_system", title:"Solar System" }
- "what is a variable" → threeScene null
- Math theorems: rough + formula; threeScene only if spatial geometry truly helps (e.g. pythagoras)
- Do NOT narrate unrelated stories just to force a fancy picture.

Other rules:
- kind MUST be intro|token|visual_shift|recap|human_summary
- humanSummary = learner thinking, never AI chain-of-thought
- Prefer 5–10 short beats
- First visual beat: imageAction generate; later same figure: keep`;

const FOLLOW_UP_SYSTEM = `You are teaching a student who asked a follow-up question in SeeThrough.
The follow-up may be related to the prior lesson OR a completely new, unrelated topic. Always answer what they asked.

Rules:
1. Answer the student's question directly. Do NOT force a connection to the prior topic if the question is unrelated.
2. If unrelated, teach it as a fresh mini-lesson (still 2–6 short beats). If related, you may briefly reference prior board content when helpful.
3. Prefer imageAction "keep" so the prior board stays on screen; only use generate when a new figure is truly needed for this answer.
4. Never wipe or clear earlier drawings — the student should be able to scroll back to prior sections.
5. Narration should teach the asked topic clearly; do not apologize for topic changes.
6. Return ONLY valid JSON with the same lesson plan schema (title, language, beats, humanSummary, threeScene).
7. Title should name this question (e.g. "Follow-up: photosynthesis" or "New: binary search").
8. Decide threeScene for THIS question the same way as a new lesson (use 3D when spatial/interactive helps).`;

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
  if (plan.threeScene === undefined) {
    plan.threeScene = null;
  }

  return plan;
}

export type LessonPlanContext = {
  rootPrompt: string;
  priorTitle?: string | null;
  priorSummary?: string | null;
  priorPlanJson?: string;
  transcript: string;
  visualSummary?: string;
};

async function completeLessonPlan(
  system: string,
  userContent: string,
): Promise<LessonPlanParsed> {
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
      { role: "system", content: system },
      { role: "user", content: userContent },
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

export async function generateLessonPlan(prompt: string): Promise<LessonPlanParsed> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("Prompt is empty");
  }
  const evidence = cardiopulmonaryEvidence(trimmed);

  return completeLessonPlan(
    SYSTEM_PROMPT,
    [
      `Create a SeeThrough lesson for:\n\n${trimmed}`,
      evidence
        ? `For claims about normal heart/lung physiology, use only this reviewed evidence and do not add unsupported medical claims:\n\n${evidence}`
        : "",
      "Use only simple, directly relevant visuals. No invented metaphors.",
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

/** Short continuation plan that keeps board context when possible. */
export async function generateFollowUpPlan(
  question: string,
  context: LessonPlanContext,
): Promise<LessonPlanParsed> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Follow-up question is empty");
  }

  const planSnippet = context.priorPlanJson
    ? context.priorPlanJson.slice(0, 3500)
    : "(plan unavailable)";
  const anatomyEvidence = cardiopulmonaryEvidence(
    trimmed,
    context.visualSummary,
  );

  return completeLessonPlan(
    FOLLOW_UP_SYSTEM,
    [
      `Original lesson prompt:\n${context.rootPrompt}`,
      context.priorTitle ? `Lesson title: ${context.priorTitle}` : "",
      context.priorSummary
        ? `Prior human summary:\n${context.priorSummary}`
        : "",
      context.visualSummary
        ? `Current board visual:\n${context.visualSummary}`
        : "",
      anatomyEvidence
        ? `Reviewed cardiopulmonary evidence for this answer. Use only this evidence for biological claims:\n${anatomyEvidence}`
        : "",
      `Conversation so far:\n${context.transcript}`,
      `Prior plan (truncated JSON):\n${planSnippet}`,
      `Student follow-up question:\n${trimmed}`,
      `Answer THIS question even if it is unrelated to the prior lesson. Prefer imageAction keep so earlier board content remains. Keep beats short.`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

