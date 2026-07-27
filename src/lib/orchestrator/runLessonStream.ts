import {
  appendTurn,
  attachLessonToConversation,
  createConversation,
  loadConversationContext,
  summarizeTurnsForPrompt,
} from "@/lib/conversations/store";
import { toUserFacingError } from "@/lib/errors/userFacing";
import {
  generateFollowUpPlan,
  generateLessonPlan,
} from "@/lib/providers/llm";
import { synthesizeSpeech } from "@/lib/providers/tts";
import { getServiceSupabase } from "@/lib/supabase/server";
import { resolveVisualWithLibrary } from "@/lib/visuals/library";
import { visualStableKey } from "@/lib/visuals/router";
import type { LessonPlanParsed } from "@/lib/schemas/lesson";
import type { VisualPlan } from "@/lib/visuals/types";
import type { StreamEvent } from "@/types/lesson";

export type RunLessonOptions = {
  prompt: string;
  withAudio?: boolean;
  signal?: AbortSignal;
  /** Continue an existing conversation with prior context */
  conversationId?: string;
  mode?: "new" | "follow_up";
  /** Optional live board summary from the client */
  visualSummary?: string;
  /** Signed-in user id when available */
  userId?: string | null;
};

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new Error("Lesson stream aborted");
  }
}

/**
 * Clean pipeline: Groq plan → visual trigger + library grow → Deepgram → SSE.
 * Follow-ups reuse conversation history and prefer keeping the current board.
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
  const isFollowUp =
    options.mode === "follow_up" || Boolean(options.conversationId);
  let lessonId: string | undefined;
  let conversationId: string | undefined = options.conversationId;
  const supabase = getServiceSupabase();

  try {
    assertNotAborted(options.signal);

    let plan: LessonPlanParsed;
    let rootPromptForVisual = prompt;

    if (isFollowUp && conversationId) {
      const ctx = await loadConversationContext(conversationId);
      if (!ctx) {
        yield {
          type: "error",
          message: "Conversation not found — start a new lesson first",
        };
        return;
      }

      rootPromptForVisual = ctx.rootPrompt || prompt;

      if (!ctx.userId || ctx.userId !== options.userId) {
        yield {
          type: "error",
          message: "Conversation not found — start a new lesson first",
        };
        return;
      }

      yield {
        type: "student_message",
        text: prompt,
        conversationId,
      };

      await appendTurn({
        conversationId,
        lessonId: ctx.lessonId,
        role: "student",
        content: prompt,
        meta: { kind: "follow_up" },
      });

      plan = await generateFollowUpPlan(prompt, {
        rootPrompt: ctx.rootPrompt,
        priorTitle: ctx.title,
        priorSummary: ctx.humanSummary,
        priorPlanJson: ctx.plan ? JSON.stringify(ctx.plan) : undefined,
        transcript: summarizeTurnsForPrompt([
          ...ctx.turns,
          {
            conversationId,
            turnOrder: ctx.turns.length + 1,
            role: "student",
            content: prompt,
          },
        ]),
        visualSummary: options.visualSummary,
      });
    } else {
      const created = await createConversation({
        rootPrompt: prompt,
        userId: options.userId ?? null,
      });
      conversationId = created.conversationId;

      await appendTurn({
        conversationId,
        role: "student",
        content: prompt,
        meta: { kind: "lesson_start" },
      });

      yield {
        type: "student_message",
        text: prompt,
        conversationId,
      };

      plan = await generateLessonPlan(prompt);
    }

    const { data: lessonRow, error: insertError } = await supabase
      .from("lessons")
      .insert({
        prompt,
        title: plan.title,
        language: plan.language,
        status: "streaming",
        plan,
        human_summary: plan.humanSummary,
        user_id: options.userId ?? null,
        conversation_id: conversationId ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      // conversation_id column may be missing before migration — retry without it
      const retry = await supabase
        .from("lessons")
        .insert({
          prompt,
          title: plan.title,
          language: plan.language,
          status: "streaming",
          plan,
          human_summary: plan.humanSummary,
          user_id: options.userId ?? null,
        })
        .select("id")
        .single();

      if (retry.error) {
        yield {
          type: "error",
          message: `Failed to save lesson: ${retry.error.message}`,
        };
        return;
      }
      lessonId = retry.data.id as string;
    } else {
      lessonId = lessonRow.id as string;
    }

    if (conversationId && lessonId) {
      await attachLessonToConversation({
        conversationId,
        lessonId,
        title: plan.title,
        plan,
        humanSummary: plan.humanSummary,
      });
    }

    yield {
      type: "plan_meta",
      title: plan.title,
      language: plan.language,
      lessonId,
      conversationId,
      beatCount: plan.beats.length,
      mode: isFollowUp ? "follow_up" : "new",
    };

    let hasVisual = false;
    let activeVisualKey: string | undefined;

    for (const beat of plan.beats) {
      assertNotAborted(options.signal);

      yield { type: "beat_start", beat };

      const decision = await resolveVisualWithLibrary({
        // Include original lesson prompt so follow-ups still match topic heuristics
        prompt: isFollowUp
          ? `${rootPromptForVisual}\n${prompt}`
          : prompt,
        beat: isFollowUp
          ? {
              ...beat,
              // Keep the live board unless this is clearly a visual shift
              // Heuristics still upgrade wrong graphs in resolveVisualWithLibrary
              imageAction:
                beat.kind === "visual_shift" ? beat.imageAction : "keep",
              visual:
                beat.kind === "visual_shift" ? beat.visual : undefined,
            }
          : beat,
        activeVisualKey,
        hasVisual,
      });

      if (decision.action === "generate" && decision.plan) {
        activeVisualKey = visualStableKey(decision.plan);
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

      if (conversationId) {
        await appendTurn({
          conversationId,
          lessonId,
          role: "tutor",
          content: beat.narration,
          meta: { beatId: beat.id, kind: beat.kind },
        });
      }

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
        beat_id: `${isFollowUp ? "fu" : "b"}-${beat.order}-${beat.id}`,
        beat_order: beat.order,
        kind: beat.kind,
        payload: {
          beat,
          visualTrigger: {
            action: decision.action,
            reason: decision.reason,
            plan: decision.plan,
          },
          conversationId,
          mode: isFollowUp ? "follow_up" : "new",
        },
        diagram_action: decision.action,
      });
    }

    yield { type: "human_summary", text: plan.humanSummary };

    if (conversationId) {
      await appendTurn({
        conversationId,
        lessonId,
        role: "system",
        content: plan.humanSummary,
        meta: { kind: "human_summary" },
      });
    }

    yield { type: "done", conversationId, lessonId };

    await supabase
      .from("lessons")
      .update({ status: "completed", human_summary: plan.humanSummary })
      .eq("id", lessonId);
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : "Unknown lesson pipeline error";
    const message = toUserFacingError(error);

    if (lessonId) {
      await supabase
        .from("lessons")
        .update({ status: "failed", error_message: raw })
        .eq("id", lessonId);
    }

    console.error("[lesson-stream]", raw);
    yield { type: "error", message };
  }
}

/** Build a compact visual summary string for follow-up LLM context. */
export function describeVisualForContext(plan: VisualPlan | null | undefined): string {
  if (!plan) return "No figure on the board yet.";
  const bits = [
    `renderer=${plan.renderer}`,
    plan.assetId ? `asset=${plan.assetId}` : null,
    plan.formula ? `formula=${plan.formula}` : null,
    plan.boardScript?.title ? `pen=${plan.boardScript.title}` : null,
    plan.sceneRecipe?.kind ? `sketch=${plan.sceneRecipe.kind}` : null,
  ].filter(Boolean);
  return bits.join(" · ");
}
