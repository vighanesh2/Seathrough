import { generateLessonPlan } from "@/lib/providers/llm";
import { synthesizeSpeech } from "@/lib/providers/tts";
import { getServiceSupabase } from "@/lib/supabase/server";
import { decideVisual } from "@/lib/triggers/visualTrigger";
import { visualKey } from "@/lib/visuals/router";
import type { StreamEvent } from "@/types/lesson";

export type RunLessonOptions = {
  prompt: string;
  withAudio?: boolean;
  signal?: AbortSignal;
};

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new Error("Lesson stream aborted");
  }
}

/**
 * Clean pipeline: Groq plan → visual trigger (prompt-relevant) → Deepgram → SSE.
 * Board never follows invented narration metaphors (e.g. Pythagoras → horse).
 */
export async function* runLessonStream(
  options: RunLessonOptions,
): AsyncGenerator<StreamEvent> {
  const prompt = options.prompt.trim();
  if (!prompt) {
    yield { type: "error", message: "Prompt is required" };
    return;
  }

  const withAudio = options.withAudio !== false;
  let lessonId: string | undefined;
  const supabase = getServiceSupabase();

  try {
    assertNotAborted(options.signal);
    const plan = await generateLessonPlan(prompt);

    const { data: lessonRow, error: insertError } = await supabase
      .from("lessons")
      .insert({
        prompt,
        title: plan.title,
        language: plan.language,
        status: "streaming",
        plan,
        human_summary: plan.humanSummary,
        user_id: null,
      })
      .select("id")
      .single();

    if (insertError) {
      yield {
        type: "error",
        message: `Failed to save lesson: ${insertError.message}`,
      };
      return;
    }

    lessonId = lessonRow.id as string;

    yield {
      type: "plan_meta",
      title: plan.title,
      language: plan.language,
      lessonId,
    };

    let hasVisual = false;
    let activeVisualKey: string | undefined;

    for (const beat of plan.beats) {
      assertNotAborted(options.signal);

      yield { type: "beat_start", beat };

      const decision = decideVisual({
        prompt,
        beat,
        activeVisualKey,
        hasVisual,
      });

      if (decision.action === "generate" && decision.plan) {
        activeVisualKey = visualKey(decision.plan);
        hasVisual = true;
        yield {
          type: "visual",
          beatId: beat.id,
          plan: decision.plan,
        };
      } else if (decision.action === "retire" && decision.plan) {
        activeVisualKey = undefined;
        yield {
          type: "visual",
          beatId: beat.id,
          plan: decision.plan,
        };
      }

      if (beat.codeDelta) {
        yield { type: "code_delta", text: beat.codeDelta };
      }

      yield {
        type: "narration",
        text: beat.narration,
        beatId: beat.id,
      };

      if (withAudio) {
        try {
          const audio = await synthesizeSpeech(beat.narration);
          yield {
            type: "audio",
            beatId: beat.id,
            mimeType: audio.mimeType,
            base64: audio.base64,
          };
        } catch (ttsError) {
          const message =
            ttsError instanceof Error ? ttsError.message : "TTS failed";
          yield {
            type: "narration",
            text: `[voice unavailable: ${message}]`,
            beatId: beat.id,
          };
        }
      }

      await supabase.from("lesson_beats").insert({
        lesson_id: lessonId,
        beat_id: beat.id,
        beat_order: beat.order,
        kind: beat.kind,
        payload: {
          beat,
          visualTrigger: {
            action: decision.action,
            reason: decision.reason,
            plan: decision.plan,
          },
        },
        diagram_action: decision.action,
      });
    }

    yield { type: "human_summary", text: plan.humanSummary };
    yield { type: "done" };

    await supabase
      .from("lessons")
      .update({ status: "completed", human_summary: plan.humanSummary })
      .eq("id", lessonId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown lesson pipeline error";

    if (lessonId) {
      await supabase
        .from("lessons")
        .update({ status: "failed", error_message: message })
        .eq("id", lessonId);
    }

    yield { type: "error", message };
  }
}
