import {
  appendTurn,
  attachLessonToConversation,
  createConversation,
  loadConversationContext,
  summarizeTurnsForPrompt,
} from "@/lib/conversations/store";
import {
  DRAW_CANVAS_HEIGHT,
  DRAW_CANVAS_WIDTH,
} from "@/lib/draw-engine/commands";
import {
  commandsForBeat,
  createBoardLayout,
  drawCommandsEndMs,
  type BoardLayout,
} from "@/lib/draw-engine/fromVisualPlan";
import {
  layoutExtentY,
  registerUmlOccupancy,
  SECTION_GAP,
} from "@/lib/draw-engine/boardLayout";
import { generateUmlDiagramPlan } from "@/lib/draw-engine/generateUmlPlan";
import {
  revealForBeat,
  threeSceneFromLessonPlan,
  type ThreeScenePlan,
} from "@/lib/three-scenes/decide";
import {
  UML_BOX_WIDTH,
  classBoxHeight,
} from "@/lib/draw-engine/umlLayout";
import {
  shouldGenerateUmlPlan,
  type UmlDiagramPlan,
} from "@/lib/draw-engine/umlSchema";
import { toUserFacingError } from "@/lib/errors/userFacing";
import {
  saveBoardSnapshot,
  type LessonBoardSnapshot,
} from "@/lib/lessons/boardSnapshot";
import {
  generateFollowUpPlan,
  generateLessonPlan,
} from "@/lib/providers/llm";
import {
  buildSpeechUnits,
  paceCommandsToNarration,
} from "@/lib/orchestrator/speechUnits";
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
  /** Lowest Y of existing board content (follow-ups stack below this). */
  boardBottomY?: number;
  /** Signed-in user id when available */
  userId?: string | null;
};

function offsetUmlPlanY(plan: UmlDiagramPlan, dy: number): UmlDiagramPlan {
  if (!dy) return plan;
  return {
    ...plan,
    classes: plan.classes.map((c) => ({ ...c, y: c.y + dy })),
    actors: plan.actors.map((a) => ({ ...a })),
    messages: plan.messages.map((m) => ({ ...m, y: m.y + dy })),
  };
}

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
    if (isFollowUp && conversationId) {
      const ctx = await loadConversationContext(conversationId);
      if (!ctx) {
        yield {
          type: "error",
          message: "Conversation not found — start a new lesson first",
        };
        return;
      }

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

    // UML lessons: generate the FULL diagram JSON once, then reveal beat-by-beat.
    let umlPlan: UmlDiagramPlan | null = null;
    const umlRevealed = new Set<string>();
    const umlPrompt = prompt;

    if (shouldGenerateUmlPlan(umlPrompt)) {
      try {
        assertNotAborted(options.signal);
        umlPlan = await generateUmlDiagramPlan({
          prompt: umlPrompt,
          lessonTitle: plan.title,
          beatCount: plan.beats.length,
          lessonText: [
            plan.title,
            plan.humanSummary,
            ...plan.beats.map((b) => b.narration),
          ]
            .filter(Boolean)
            .join("\n"),
        });
        yield { type: "diagram_plan", kind: "uml", plan: umlPlan };
      } catch (umlError) {
        console.error(
          "[lesson-stream] UML plan generation failed",
          umlError instanceof Error ? umlError.message : umlError,
        );
        umlPlan = null;
      }
    }

    // Planner decides whether this lesson gets interactive Three.js (not keywords).
    let threePlan: ThreeScenePlan | null = null;
    if (!umlPlan) {
      threePlan = threeSceneFromLessonPlan(plan);
      if (threePlan) {
        threePlan = {
          ...threePlan,
          reveal: revealForBeat(threePlan, 1, plan.beats.length),
        };
        yield { type: "three_scene", plan: threePlan };
      }
    }

    const priorBottom = Math.max(0, options.boardBottomY ?? 0);
    const sectionOffsetY =
      isFollowUp && priorBottom > 40
        ? Math.ceil(priorBottom + SECTION_GAP)
        : 0;
    const keepPriorBoard = isFollowUp && sectionOffsetY > 0;
    if (umlPlan && sectionOffsetY > 0) {
      umlPlan = offsetUmlPlanY(umlPlan, sectionOffsetY);
    }

    let hasVisual = false;
    let activeVisualKey: string | undefined;
    let activePlan: VisualPlan | null = null;
    let drawClockMs = 0;
    let drawSessionStarted = false;
    let boardLayout: BoardLayout = createBoardLayout(sectionOffsetY);
    const snapshotCommands: import("@/lib/draw-engine/commands").DrawCommand[] =
      [];
    let snapshotCanvasHeight = DRAW_CANVAS_HEIGHT;

    for (const beat of plan.beats) {
      assertNotAborted(options.signal);

      yield { type: "beat_start", beat };

      /** This beat's writing steps — the voice is cued off them. */
      let beatDrawCmds: import("@/lib/draw-engine/commands").DrawCommand[] = [];

      if (threePlan) {
        const nextReveal = revealForBeat(
          threePlan,
          beat.order,
          plan.beats.length,
        );
        if (nextReveal !== threePlan.reveal) {
          threePlan = { ...threePlan, reveal: nextReveal };
          yield { type: "three_scene", plan: threePlan };
        }
      }

      const decision = threePlan
        ? {
            action: "keep" as const,
            reason: "Interactive 3D scene owns the visual stage",
            plan: null,
          }
        : await resolveVisualWithLibrary({
            // Always route visuals from the CURRENT question only.
            // Including prior lesson text here falsely rematches old assets
            // (e.g. "class" → "Class blueprint → objects" on a cryptography follow-up).
            prompt,
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
        activePlan = decision.plan;
        hasVisual = true;
        yield {
          type: "visual",
          beatId: beat.id,
          plan: decision.plan,
        };
      } else if (decision.action === "retire" && decision.plan) {
        activeVisualKey = undefined;
        activePlan = null;
        yield {
          type: "visual",
          beatId: beat.id,
          plan: decision.plan,
        };
        if (drawSessionStarted) {
          if (!keepPriorBoard) {
            const clearCmd = {
              id: `clear-${beat.id}`,
              type: "clear" as const,
              t0: drawClockMs,
              durationMs: 0,
            };
            snapshotCommands.push(clearCmd);
            yield {
              type: "draw_cmd",
              command: clearCmd,
            };
            drawClockMs += 200;
            boardLayout = createBoardLayout(sectionOffsetY);
          }
        }
      } else if (decision.action === "keep" && decision.plan) {
        // Keep identity, but refresh active plan if library returned one.
        activePlan = decision.plan;
      }

      if (!threePlan) {
        // Every 2D beat draws something — 3D lessons update their live scene.
        if (!drawSessionStarted) {
          drawSessionStarted = true;
          boardLayout = createBoardLayout(sectionOffsetY);
          if (umlPlan?.kind === "class") {
            registerUmlOccupancy(
              boardLayout,
              umlPlan.classes.map((c) => ({
                id: `uml-${c.id}`,
                x: c.x,
                y: c.y,
                w: UML_BOX_WIDTH,
                h: classBoxHeight(c),
              })),
              [],
            );
          }
          const canvasHeight = Math.max(
            DRAW_CANVAS_HEIGHT,
            layoutExtentY(boardLayout),
            sectionOffsetY + DRAW_CANVAS_HEIGHT,
          );
          snapshotCanvasHeight = Math.max(snapshotCanvasHeight, canvasHeight);
          yield {
            type: "draw_session",
            title: plan.title,
            canvas: {
              width: DRAW_CANVAS_WIDTH,
              height: canvasHeight,
            },
            reset: !keepPriorBoard,
            scrollToY: keepPriorBoard ? sectionOffsetY : undefined,
          };
        }

        const drawBeatId =
          sectionOffsetY > 0
            ? `s${Math.round(sectionOffsetY)}-${beat.id}`
            : beat.id;

        beatDrawCmds = commandsForBeat({
          plan: activePlan,
          beatOrder: beat.order,
          totalBeats: plan.beats.length,
          beatId: drawBeatId,
          t0Base: drawClockMs,
          includeChrome: decision.action === "generate" || beat.order <= 1,
          progressive: true,
          narration: beat.narration,
          highlight: beat.highlight,
          prompt: umlPrompt,
          umlPlan,
          umlRevealed,
          layout: boardLayout,
          beatKind: beat.kind,
        });

        // Let the writing breathe across the narration instead of racing it.
        beatDrawCmds = paceCommandsToNarration(beatDrawCmds, beat.narration);

        if (beatDrawCmds.length) {
          snapshotCommands.push(...beatDrawCmds);
          snapshotCanvasHeight = Math.max(
            snapshotCanvasHeight,
            layoutExtentY(boardLayout),
          );
          yield {
            type: "draw_cmds",
            commands: beatDrawCmds,
            beatId: drawBeatId,
          };
          drawClockMs = Math.max(
            drawClockMs + 400,
            drawCommandsEndMs(beatDrawCmds) + 250,
          );
        }
      }

      if (beat.codeDelta) {
        yield { type: "code_delta", text: beat.codeDelta };
      }

      yield {
        type: "narration",
        text: beat.narration,
        beatId: beat.id,
      };

      const speechUnits = buildSpeechUnits(
        beat.narration,
        beatDrawCmds,
        Math.max(0, drawClockMs - 200),
      );

      // With voice on, each unit updates the caption as it is spoken; without
      // it the board caption carries the whole line.
      yield {
        type: "draw_speak",
        text:
          withAudio && speechUnits.length
            ? speechUnits[0]!.text
            : beat.narration,
        t0: speechUnits[0]?.cueT0 ?? Math.max(0, drawClockMs - 200),
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
        // Synthesize the whole beat at once so units play back-to-back
        // instead of leaving a TTS gap between sentences.
        const clips = await Promise.allSettled(
          speechUnits.map((unit) => synthesizeSpeech(unit.text)),
        );

        let spoke = false;
        for (const [i, unit] of speechUnits.entries()) {
          const clip = clips[i];
          if (clip?.status !== "fulfilled") continue;
          spoke = true;
          yield {
            type: "audio",
            beatId: beat.id,
            mimeType: clip.value.mimeType,
            base64: clip.value.base64,
            text: unit.text,
            cueT0: unit.cueT0,
          };
        }

        // Only call the beat silent when nothing at all came back.
        if (speechUnits.length && !spoke) {
          const failure = clips.find((c) => c.status === "rejected");
          const reason =
            failure?.status === "rejected" ? failure.reason : undefined;
          const message =
            reason instanceof Error ? reason.message : "TTS failed";
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

    if (lessonId) {
      const snapshot: LessonBoardSnapshot = {
        version: 1,
        title: plan.title,
        prompt,
        canvas: {
          width: DRAW_CANVAS_WIDTH,
          height: Math.max(
            snapshotCanvasHeight,
            layoutExtentY(boardLayout),
            DRAW_CANVAS_HEIGHT,
          ),
        },
        commands: snapshotCommands,
        visualPlan: threePlan ? null : activePlan,
        threeScene: threePlan
          ? {
              ...threePlan,
              reveal: revealForBeat(
                threePlan,
                plan.beats.length,
                plan.beats.length,
              ),
            }
          : null,
        umlPlan,
      };
      try {
        await saveBoardSnapshot(lessonId, snapshot);
      } catch (snapError) {
        console.error(
          "[lesson-stream] board snapshot save failed",
          snapError instanceof Error ? snapError.message : snapError,
        );
      }
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
