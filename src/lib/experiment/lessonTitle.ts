import OpenAI from "openai";
import { getLlmConfig } from "@/lib/env";
import type { ExperimentLesson } from "@/lib/experiment/scene";

const TITLE_MAX = 60;

export function fallbackLessonTitle(lesson: ExperimentLesson): string {
  const fromTitle = lesson.title?.trim() ?? "";
  if (fromTitle && !/^explanation$/i.test(fromTitle)) {
    return clipTitle(fromTitle);
  }
  const fromQuestion = lesson.question?.trim() ?? "";
  if (fromQuestion) return clipTitle(fromQuestion);
  return "Saved lesson";
}

export function clipTitle(value: string): string {
  const cleaned = value
    .replace(/^["'`\s]+|["'`\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Saved lesson";
  if (cleaned.length <= TITLE_MAX) return cleaned;
  const sliced = cleaned.slice(0, TITLE_MAX - 1);
  const cut = sliced.lastIndexOf(" ");
  return `${(cut > 24 ? sliced.slice(0, cut) : sliced).trim()}…`;
}

export async function generateLessonTitle(
  lesson: ExperimentLesson,
): Promise<{ title: string; source: "ai" | "lesson" }> {
  const fallback = fallbackLessonTitle(lesson);
  const script = lesson.beats
    .slice(0, 3)
    .map((beat) => beat.say.trim())
    .filter(Boolean)
    .join(" ");
  try {
    const cfg = getLlmConfig();
    const client = new OpenAI({
      apiKey: cfg.apiKey,
      ...(cfg.baseURL ? { baseURL: cfg.baseURL } : {}),
    });
    const completion = await client.chat.completions.create({
      model: cfg.model,
      temperature: 0.3,
      max_tokens: 24,
      messages: [
        {
          role: "system",
          content:
            "Title a short tutoring video in 3–7 words. Title Case. No quotes, no trailing period.",
        },
        {
          role: "user",
          content: `Question: ${lesson.question || fallback}\nLesson: ${script || fallback}`,
        },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const title = clipTitle(raw);
    if (!title || title === "Saved lesson") {
      return { title: fallback, source: "lesson" };
    }
    return { title, source: "ai" };
  } catch {
    return { title: fallback, source: "lesson" };
  }
}
