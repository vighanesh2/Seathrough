import OpenAI from "openai";
import { getLlmConfig } from "@/lib/env";
import {
  teachPlanSchema,
  type TeachPlanParsed,
} from "@/lib/browser-experience/schemas";
import type {
  BrowserChatMessage,
  BrowserTeachBeat,
} from "@/lib/browser-experience/types";
import type { LessonSource } from "@/types/lesson";

function clip(value: string, max: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("empty");
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    /* continue */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    return JSON.parse(fence[1].trim()) as unknown;
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  }
  throw new Error("invalid json");
}

function failedGeneration(error: unknown): string | undefined {
  if (!(error instanceof OpenAI.APIError)) return undefined;
  const body = error.error as { failed_generation?: unknown } | undefined;
  return typeof body?.failed_generation === "string"
    ? body.failed_generation
    : undefined;
}

function messageText(message: {
  content?: unknown;
  reasoning?: unknown;
}): string {
  const content = message.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const joined = content
      .map((part) =>
        typeof part === "object" && part && "text" in part
          ? String((part as { text?: string }).text ?? "")
          : "",
      )
      .join("")
      .trim();
    if (joined) return joined;
  }
  return "";
}

async function completeJson(system: string, user: string): Promise<unknown> {
  const config = getLlmConfig();
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
  const groq = config.provider === "groq";

  const request = (jsonMode: boolean) =>
    client.chat.completions.create({
      model: config.model,
      temperature: 0.2,
      // Reasoning models spend budget on hidden chain-of-thought first.
      max_tokens: groq ? 4096 : 2200,
      ...(groq
        ? { reasoning_effort: "low" as const, include_reasoning: false }
        : {}),
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      messages: [
        {
          role: "system",
          content: jsonMode
            ? system
            : `${system}\n\nReturn a single JSON object only. No markdown fences.`,
        },
        { role: "user", content: user },
      ],
    });

  let content = "";
  try {
    const completion = await request(true);
    content = messageText(completion.choices[0]?.message ?? {});
  } catch (error) {
    const refused = failedGeneration(error);
    if (refused) {
      try {
        return extractJsonObject(refused);
      } catch {
        /* retry without json mode below */
      }
    } else if (!(error instanceof OpenAI.APIError)) {
      throw error;
    }
  }

  if (!content.trim()) {
    const completion = await request(false);
    content = messageText(completion.choices[0]?.message ?? {});
  }

  if (!content.trim()) {
    throw new Error("empty model response");
  }
  return extractJsonObject(content);
}

const SYSTEM = `You are SeeThrough Browser Tutor.
You teach on a real webpage with a Zoom-style tutor cursor. You may also click links/buttons when needed.

Return ONLY a JSON object with this shape:
{
  "title": "short title",
  "summary": "1-2 sentence overview",
  "beats": [
    {
      "id": "b1",
      "speech": "short spoken line, max 2 sentences",
      "annotation": {
        "kind": "highlight" | "click" | "clear",
        "text": "exact short label from POINTABLE ANCHORS or PAGE TEXT",
        "label": "optional short callout",
        "seconds": 0
      },
      "holdMs": 900
    }
  ]
}

Rules:
- 3 to 7 beats. Prefer pointing at DIFFERENT parts/sections.
- Use kind "highlight" to point. Use kind "click" when the student needs a tab, accordion, "show more", or in-page link opened (text = visible button/link label).
- annotation.text MUST be copied verbatim from POINTABLE ANCHORS when possible.
- Prefer concrete labels over long sentences.
- speech explains the pointed/clicked thing; do not invent facts missing from PAGE TEXT + SOURCE.
- First beat orients; last beat wraps up.
- JSON only.`;

const YOUTUBE_SYSTEM = `You are SeeThrough Browser Tutor for YouTube.
You teach by playing a video, seeking to key moments, pausing, and explaining.

Return ONLY JSON:
{
  "title": "short title",
  "summary": "1-2 sentence overview",
  "beats": [
    {
      "id": "b1",
      "speech": "short spoken line",
      "annotation": {
        "kind": "youtube_play" | "youtube_seek" | "youtube_pause" | "clear",
        "seconds": 35,
        "label": "optional"
      },
      "holdMs": 1200
    }
  ]
}

Rules:
- 4 to 8 beats.
- Start with youtube_play (brief intro), then mostly youtube_seek beats.
- youtube_seek MUST include seconds (integer). After seek the player pauses so you can explain the frozen frame.
- Pick increasing timestamps that match the topic (estimate from title/description if needed). Keep seeks under the video duration when known.
- speech explains what is on screen at that moment.
- End with a short wrap-up (youtube_pause or final seek).
- JSON only.`;

function pickPhrases(
  pageText: string,
  anchors: string[],
  limit = 5,
): string[] {
  const fromAnchors = anchors
    .map((a) => a.trim())
    .filter((a) => a.length >= 3 && a.length <= 60)
    .slice(0, limit);
  if (fromAnchors.length >= 2) return fromAnchors;

  const sentences = pageText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 40 && s.length <= 220);
  const phrases: string[] = [...fromAnchors];
  for (const sentence of sentences) {
    const words = sentence.split(" ").filter(Boolean);
    if (words.length < 4) continue;
    const slice = words.slice(0, Math.min(8, words.length)).join(" ");
    if (!phrases.includes(slice)) phrases.push(slice);
    if (phrases.length >= limit) break;
  }
  if (!phrases.length) {
    const words = pageText.split(/\s+/).filter(Boolean).slice(0, 8);
    if (words.length >= 3) phrases.push(words.join(" "));
  }
  return phrases;
}

/** Deterministic backup when the model returns unusable JSON. */
export function fallbackTeachPlan(input: {
  question: string;
  source: LessonSource;
  pageTitle: string;
  pageText: string;
  anchors?: string[];
}): TeachPlanParsed {
  const phrases = pickPhrases(input.pageText, input.anchors ?? [], 5);
  const title = clip(input.pageTitle || input.source.title || "Browser lesson", 160);
  const summary = clip(
    `Using ${input.source.publisher}, here is what matters for: ${input.question}`,
    600,
  );
  const beats =
    phrases.length > 0
      ? phrases.map((text, index) => ({
          id: `b${index + 1}`,
          speech: clip(
            index === 0
              ? `Let's start with this part of the page: ${text}.`
              : index === phrases.length - 1
                ? `Finally, notice ${text} — that rounds out the picture.`
                : `Next, look at ${text}.`,
            500,
          ),
          annotation: {
            kind: "highlight" as const,
            text,
            label: text,
          },
          holdMs: 1100,
        }))
      : [
          {
            id: "b1",
            speech: clip(
              `I opened ${input.source.publisher}. Ask a follow-up and I will point to the exact lines.`,
              500,
            ),
            annotation: { kind: "clear" as const },
            holdMs: 900,
          },
        ];

  return teachPlanSchema.parse({ title, summary, beats });
}

const ACTION_KINDS = new Set([
  "highlight",
  "circle",
  "clear",
  "click",
  "youtube_play",
  "youtube_pause",
  "youtube_seek",
]);

function normalizeAnnotation(value: unknown): {
  kind:
    | "highlight"
    | "circle"
    | "clear"
    | "click"
    | "youtube_play"
    | "youtube_pause"
    | "youtube_seek";
  text?: string;
  selector?: string;
  label?: string;
  seconds?: number;
} {
  if (!value || typeof value !== "object") return { kind: "clear" };
  const a = value as Record<string, unknown>;
  const kindRaw = String(a.kind ?? "highlight").toLowerCase();
  const kind = ACTION_KINDS.has(kindRaw)
    ? (kindRaw as
        | "highlight"
        | "circle"
        | "clear"
        | "click"
        | "youtube_play"
        | "youtube_pause"
        | "youtube_seek")
    : "highlight";
  const text =
    typeof a.text === "string" && a.text.trim()
      ? clip(a.text, 400)
      : undefined;
  const selector =
    typeof a.selector === "string" && a.selector.trim()
      ? clip(a.selector, 300)
      : undefined;
  const label =
    typeof a.label === "string" && a.label.trim()
      ? clip(a.label, 160)
      : undefined;
  const secondsRaw = a.seconds ?? a.time ?? a.t;
  const seconds =
    typeof secondsRaw === "number"
      ? secondsRaw
      : typeof secondsRaw === "string" && Number.isFinite(Number(secondsRaw))
        ? Number(secondsRaw)
        : undefined;

  if (kind === "youtube_play" || kind === "youtube_pause") {
    return { kind, ...(label ? { label } : {}) };
  }
  if (kind === "youtube_seek") {
    return {
      kind,
      seconds: Math.max(0, Math.floor(seconds ?? 0)),
      ...(label ? { label } : {}),
    };
  }
  if (kind === "clear") return { kind: "clear" };
  if (!text && !selector) return { kind: "clear" };
  return {
    kind,
    ...(text ? { text } : {}),
    ...(selector ? { selector } : {}),
    ...(label ? { label } : {}),
  };
}

function normalizePlan(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;
  const rawBeats = Array.isArray(obj.beats)
    ? obj.beats
    : Array.isArray(obj.steps)
      ? obj.steps
      : [];

  const beats = rawBeats
    .map((beat, index) => {
      if (!beat || typeof beat !== "object") return null;
      const b = beat as Record<string, unknown>;
      const speech =
        typeof b.speech === "string"
          ? b.speech
          : typeof b.narration === "string"
            ? b.narration
            : typeof b.text === "string"
              ? b.text
              : "";
      const trimmedSpeech = clip(speech, 500);
      if (!trimmedSpeech) return null;
      const holdRaw = b.holdMs ?? b.hold_ms ?? b.pauseMs;
      const holdMs =
        typeof holdRaw === "number"
          ? holdRaw
          : typeof holdRaw === "string" && Number.isFinite(Number(holdRaw))
            ? Number(holdRaw)
            : 900;
      return {
        id:
          typeof b.id === "string" && b.id.trim()
            ? clip(b.id, 40)
            : `b${index + 1}`,
        speech: trimmedSpeech,
        holdMs: Math.max(0, Math.min(20_000, Math.round(holdMs))),
        annotation: normalizeAnnotation(b.annotation ?? b.highlight ?? b.mark),
      };
    })
    .filter(Boolean);

  return {
    title: clip(
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title
        : "Browser lesson",
      160,
    ),
    summary: clip(
      typeof obj.summary === "string" && obj.summary.trim()
        ? obj.summary
        : typeof obj.overview === "string" && obj.overview.trim()
          ? obj.overview
          : "Here is what this page is saying.",
      600,
    ),
    beats,
  };
}

function fallbackYouTubePlan(input: {
  question: string;
  source: LessonSource;
  pageTitle: string;
  durationSec?: number | null;
}): TeachPlanParsed {
  const duration = input.durationSec && input.durationSec > 30 ? input.durationSec : 240;
  const marks = [8, 35, 70, 110, 160]
    .map((s) => Math.min(s, Math.max(5, duration - 5)))
    .filter((s, i, arr) => i === 0 || s > arr[i - 1]!);
  const title = clip(input.pageTitle || input.source.title || "YouTube lesson", 160);
  const summary = clip(
    `We'll watch key moments from this video about: ${input.question}`,
    600,
  );
  const beats = [
    {
      id: "b1",
      speech: "I'll play this video and pause on the important parts.",
      annotation: { kind: "youtube_play" as const },
      holdMs: 1600,
    },
    ...marks.map((seconds, index) => ({
      id: `b${index + 2}`,
      speech: clip(
        index === marks.length - 1
          ? "That covers the main idea from this clip."
          : `Here's a key moment — I'll pause so we can look at it.`,
        500,
      ),
      annotation: {
        kind: "youtube_seek" as const,
        seconds,
        label: `${seconds}s`,
      },
      holdMs: 1400,
    })),
  ];
  return teachPlanSchema.parse({ title, summary, beats });
}

export async function planBrowserLesson(input: {
  question: string;
  source: LessonSource;
  pageTitle: string;
  pageUrl: string;
  pageText: string;
  anchors?: string[];
  hasLargeFigure?: boolean;
  isYouTube?: boolean;
  durationSec?: number | null;
  history?: BrowserChatMessage[];
  followUp?: boolean;
}): Promise<TeachPlanParsed> {
  const historyBlock =
    input.history && input.history.length
      ? input.history
          .slice(-8)
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n")
      : "";

  const anchors = input.anchors ?? [];

  if (input.isYouTube) {
    const user = [
      input.followUp ? "MODE: follow-up on this video" : "MODE: first video explanation",
      `QUESTION: ${input.question}`,
      `VIDEO TITLE: ${input.pageTitle}`,
      `VIDEO URL: ${input.pageUrl}`,
      `DESCRIPTION/EXCERPT: ${input.source.excerpt}`,
      input.durationSec ? `DURATION_SECONDS: ${input.durationSec}` : "",
      historyBlock ? `CHAT:\n${historyBlock}` : "",
      `PAGE TEXT / DESCRIPTION:\n${input.pageText.slice(0, 4_000)}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const raw = await completeJson(YOUTUBE_SYSTEM, user);
      const plan = teachPlanSchema.safeParse(normalizePlan(raw));
      if (plan.success) return plan.data;
    } catch (error) {
      console.warn(
        "[browser-experience] youtube plan failed",
        error instanceof Error ? error.message : error,
      );
    }
    return fallbackYouTubePlan(input);
  }

  const user = [
    input.followUp
      ? "MODE: follow-up on the same page"
      : "MODE: first explanation",
    `QUESTION: ${input.question}`,
    `SOURCE TITLE: ${input.source.title}`,
    `SOURCE URL: ${input.source.url}`,
    `SOURCE EXCERPT: ${input.source.excerpt}`,
    `PAGE TITLE: ${input.pageTitle}`,
    `PAGE URL: ${input.pageUrl}`,
    input.hasLargeFigure
      ? "PAGE HAS A LARGE DIAGRAM/FIGURE — walk part-by-part using anchors so the cursor moves."
      : "",
    anchors.length
      ? `POINTABLE ANCHORS (prefer these verbatim for annotation.text):\n${anchors
          .slice(0, 30)
          .map((a) => `- ${a}`)
          .join("\n")}`
      : "",
    historyBlock ? `CHAT:\n${historyBlock}` : "",
    `PAGE TEXT:\n${input.pageText.slice(0, 8_000)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const raw = await completeJson(SYSTEM, user);
    const plan = teachPlanSchema.safeParse(normalizePlan(raw));
    if (plan.success) return rewriteBeatsToAnchors(plan.data, anchors);
    console.warn(
      "[browser-experience] teach plan schema failed",
      plan.error.issues.slice(0, 4),
    );
  } catch (error) {
    console.warn(
      "[browser-experience] teach plan LLM failed",
      error instanceof Error ? error.message : error,
    );
  }

  return fallbackTeachPlan(input);
}

/** If the model invents labels, snap annotation.text onto the closest real anchor. */
function rewriteBeatsToAnchors(
  plan: TeachPlanParsed,
  anchors: string[],
): TeachPlanParsed {
  if (!anchors.length) return plan;
  const normalized = anchors.map((a) => ({
    raw: a,
    key: a.toLowerCase(),
  }));
  const beats = plan.beats.map((beat) => {
    const text = beat.annotation.text?.trim();
    if (!text) return beat;
    const key = text.toLowerCase();
    const exact = normalized.find((a) => a.key === key);
    if (exact) {
      return {
        ...beat,
        annotation: {
          ...beat.annotation,
          text: exact.raw,
          label: beat.annotation.label || exact.raw,
        },
      };
    }
    const partial = normalized.find(
      (a) => a.key.includes(key) || key.includes(a.key),
    );
    if (partial) {
      return {
        ...beat,
        annotation: {
          ...beat.annotation,
          text: partial.raw,
          label: beat.annotation.label || partial.raw,
        },
      };
    }
    return {
      ...beat,
      annotation: {
        ...beat.annotation,
        label: beat.annotation.label || text,
      },
    };
  });
  return { ...plan, beats };
}

export function beatsFromPlan(plan: TeachPlanParsed): BrowserTeachBeat[] {
  return plan.beats.map((beat) => ({
    id: beat.id,
    speech: beat.speech,
    annotation: beat.annotation,
    holdMs: beat.holdMs ?? 900,
  }));
}
