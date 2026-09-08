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
  reserve,
  SECTION_GAP,
} from "@/lib/draw-engine/boardLayout";
import { generateUmlDiagramPlan } from "@/lib/draw-engine/generateUmlPlan";
import { generatedSvgToDrawCommand } from "@/lib/draw-engine/fromGeneratedSvg";
import { generateEducationalSvg } from "@/lib/automatic-drawing/svg/generateSvg";
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
import { narrationMatchingBoard } from "@/lib/visuals/library/scriptReveal";
import { formatNarrationForDisplay } from "@/lib/math/formatNarrationForDisplay";
import {
  saveBoardSnapshot,
  type LessonBoardSnapshot,
} from "@/lib/lessons/boardSnapshot";
import {
  generateFollowUpPlan,
  generateLessonPlan,
} from "@/lib/providers/llm";
import {
  formatWebEvidence,
  searchLessonSources,
} from "@/lib/providers/tavily";
import {
  buildSpeechUnits,
  paceCommandsToNarration,
} from "@/lib/orchestrator/speechUnits";
import { synthesizeSpeech } from "@/lib/providers/tts";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getTavilyConfig } from "@/lib/env";
import { resolveVisualWithLibrary } from "@/lib/visuals/library";
import { topicVisualPlanFor } from "@/lib/topics/plan";
import { getTopicModule } from "@/lib/topics/registry";
import { buildTopicLessonPlan } from "@/lib/topics/topicLesson";
import { visualStableKey } from "@/lib/visuals/router";
import type { LessonPlanParsed } from "@/lib/schemas/lesson";
import type { VisualPlan } from "@/lib/visuals/types";
import type { LessonSource, StreamEvent } from "@/types/lesson";

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

function priorSources(plan: unknown): LessonSource[] {
  if (!plan || typeof plan !== "object") return [];
  const sources = (plan as { sources?: unknown }).sources;
  if (!Array.isArray(sources)) return [];
  return sources.filter(
    (source): source is LessonSource =>
      Boolean(
        source &&
          typeof source === "object" &&
          typeof (source as LessonSource).id === "string" &&
          typeof (source as LessonSource).title === "string" &&
          typeof (source as LessonSource).url === "string",
      ),
  );
}

function mergeSources(
  existing: LessonSource[],
  fresh: LessonSource[],
): LessonSource[] {
  const merged = new Map<string, LessonSource>();
  for (const source of [...existing, ...fresh]) merged.set(source.url, source);
  return [...merged.values()].slice(-8).map((source, index) => ({
    ...source,
    id: `S${index + 1}`,
  }));
}

async function researchSources(
  query: string,
  signal?: AbortSignal,
): Promise<{ sources: LessonSource[]; failed: boolean }> {
  try {
    return {
      sources: await searchLessonSources(query, signal),
      failed: false,
    };
  } catch (error) {
    console.warn(
      "[lesson-stream] web research unavailable",
      error instanceof Error ? error.message : "search failed",
    );
    return { sources: [], failed: true };
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
    options.mode === "follow_up" && Boolean(options.conversationId);
  let lessonId: string | undefined;
  let conversationId: string | undefined = options.conversationId;
  const supabase = getServiceSupabase();

  try {
    assertNotAborted(options.signal);

    let plan: LessonPlanParsed;
    let sources: LessonSource[] = [];
    let topicHint = "";
    if (isFollowUp && conversationId) {
      const ctx = await loadConversationContext(conversationId);
      if (!ctx) {
        yield {
          type: "error",
          message: "Conversation not found — start a new lesson first",
        };
        return;
      }

      // Same owner only. Guests create rows with userId null — both-null is a
      // valid same-session follow-up, not a missing conversation.
      if ((ctx.userId ?? null) !== (options.userId ?? null)) {
        yield {
          type: "error",
          message: "Conversation not found — start a new lesson first",
        };
        return;
      }

      topicHint = [ctx.rootPrompt, ctx.title].filter(Boolean).join(" ");
      yield {
        type: "student_message",
        text: prompt,
        conversationId,
      };

      let freshSources: LessonSource[] = [];
      if (getTavilyConfig().apiKey) {
        yield {
          type: "pipeline_status",
          stage: "research",
          state: "started",
        };
        const research = await researchSources(
          [ctx.title || ctx.rootPrompt, prompt].filter(Boolean).join(": "),
          options.signal,
        );
        freshSources = research.sources;
        yield research.failed
          ? {
              type: "pipeline_status",
              stage: "research",
              state: "failed",
              reason: "upstream_error",
              recoverable: true,
            }
          : {
              type: "pipeline_status",
              stage: "research",
              state: "completed",
              reason: freshSources.length ? undefined : "no_results",
              completed: freshSources.length,
              total: freshSources.length,
            };
      } else {
        yield {
          type: "pipeline_status",
          stage: "research",
          state: "skipped",
          reason: "not_configured",
        };
      }
      sources = mergeSources(priorSources(ctx.plan), freshSources);

      await appendTurn({
        conversationId,
        lessonId: ctx.lessonId,
        role: "student",
        content: prompt,
        meta: { kind: "follow_up" },
      });

      yield {
        type: "pipeline_status",
        stage: "lesson_plan",
        state: "started",
      };
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
        webEvidence: formatWebEvidence(freshSources),
      });
      yield {
        type: "pipeline_status",
        stage: "lesson_plan",
        state: "completed",
      };
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

      if (getTavilyConfig().apiKey) {
        yield {
          type: "pipeline_status",
          stage: "research",
          state: "started",
        };
        const research = await researchSources(prompt, options.signal);
        sources = research.sources;
        yield research.failed
          ? {
              type: "pipeline_status",
              stage: "research",
              state: "failed",
              reason: "upstream_error",
              recoverable: true,
            }
          : {
              type: "pipeline_status",
              stage: "research",
              state: "completed",
              reason: sources.length ? undefined : "no_results",
              completed: sources.length,
              total: sources.length,
            };
      } else {
        yield {
          type: "pipeline_status",
          stage: "research",
          state: "skipped",
          reason: "not_configured",
        };
      }
      yield {
        type: "pipeline_status",
        stage: "lesson_plan",
        state: "started",
      };
      plan = await generateLessonPlan(prompt, formatWebEvidence(sources));
      yield {
        type: "pipeline_status",
        stage: "lesson_plan",
        state: "completed",
      };
    }

    plan = { ...plan, sources };
    if (sources.length) {
      yield { type: "sources", sources };
    }

    const topicConceptKey =
      plan.beats.find((b) => b.conceptKey?.trim())?.conceptKey ?? plan.title;
    const topicPlan =
      topicVisualPlanFor(prompt) ??
      topicVisualPlanFor(prompt, topicConceptKey, topicHint);
    const topicModule = topicPlan ? getTopicModule(topicPlan.topicId) : null;
    if (topicModule) {
      // Include the root topic phrase so follow-ups like "2 2 12 2 6 10 1"
      // still derive assessment inputs against the matched construction.
      const topicPrompt = [prompt, topicHint].filter(Boolean).join(" ");
      plan = buildTopicLessonPlan(plan, topicModule, topicPrompt);
    }

    yield {
      type: "pipeline_status",
      stage: "persistence",
      state: "started",
    };
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
          type: "pipeline_status",
          stage: "persistence",
          state: "failed",
          reason: "upstream_error",
        };
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
      type: "pipeline_status",
      stage: "persistence",
      state: "completed",
    };

    yield {
      type: "plan_meta",
      title: plan.title,
      language: plan.language,
      lessonId,
      conversationId,
      beatCount: plan.beats.length,
      mode: isFollowUp ? "follow_up" : "new",
    };

    yield {
      type: "pipeline_status",
      stage: "visuals",
      state: "started",
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

    // A curated interactive owns the whole board, the way a 3D scene does, so
    // this lesson skips the pen path instead of drawing under it.
    const usesTopicBoard =
      !umlPlan && !threePlan && topicPlan !== null;

    const priorBottom = Math.max(0, options.boardBottomY ?? 0);
    const sectionOffsetY =
      isFollowUp && priorBottom > 40
        ? Math.ceil(priorBottom + SECTION_GAP)
        : 0;
    const keepPriorBoard = isFollowUp && sectionOffsetY > 0;
    if (umlPlan && sectionOffsetY > 0) {
      umlPlan = offsetUmlPlanY(umlPlan, sectionOffsetY);
    }

    // Generic topics have no curated asset or interactive renderer. Generate
    // sanitized SVG code so literature/history lessons get a real diagram.
    let generatedVisualCommands: import("@/lib/draw-engine/commands").DrawCommand[] =
      [];
    let generatedSvgFailed = false;
    if (!umlPlan && !threePlan && !usesTopicBoard) {
      // Generated lesson art is the only 2D visual on this path. Cached or
      // fetched companion SVGs are not layered over it.
      const timeout = AbortSignal.timeout(60_000);
      const visualSignal = options.signal
        ? AbortSignal.any([options.signal, timeout])
        : timeout;
      try {
        const evidence = (plan.sources ?? [])
          .slice(0, 3)
          .map((source) => `${source.title}: ${source.excerpt}`)
          .join("\n");
        const generated = await generateEducationalSvg({
          prompt,
          lessonTitle: plan.title,
          lessonSummary: plan.humanSummary,
          lessonPoints: plan.beats.map((beat) => beat.narration),
          evidence: evidence || undefined,
          signal: visualSignal,
        });
        generatedVisualCommands = [
          generatedSvgToDrawCommand({
            dataUrl: generated.dataUrl,
            alt: generated.alt,
            placement: {
              x: 70,
              y: sectionOffsetY + 72,
              width: 760,
              height: 507,
            },
          }),
        ];
      } catch (visualError) {
        if (options.signal?.aborted) throw visualError;
        generatedSvgFailed = true;
        console.error(
          "[lesson-stream] generated SVG failed; using pen fallback",
          visualError instanceof Error ? visualError.message : visualError,
        );
      }
    }
    yield {
      type: "pipeline_status",
      stage: "visuals",
      state: "completed",
      reason: generatedSvgFailed ? "fallback_used" : undefined,
    };

    let hasVisual = false;
    let activeVisualKey: string | undefined;
    let activePlan: VisualPlan | null = null;
    let drawClockMs = generatedVisualCommands.reduce(
      (end, command) =>
        Math.max(end, command.t0 + Math.max(0, command.durationMs)),
      0,
    );
    let drawSessionStarted = false;
    let boardLayout: BoardLayout = createBoardLayout(sectionOffsetY);
    let generatedVisualPending = generatedVisualCommands.length > 0;
    const snapshotCommands: import("@/lib/draw-engine/commands").DrawCommand[] =
      [];
    let snapshotCanvasHeight = DRAW_CANVAS_HEIGHT;
    if (!withAudio) {
      yield {
        type: "pipeline_status",
        stage: "audio",
        state: "skipped",
        reason: "disabled",
      };
    }

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
        : generatedVisualCommands.length
          ? {
              action: "keep" as const,
              reason: "Generated lesson visual owns the visual stage",
              plan: null,
            }
        : await resolveVisualWithLibrary({
            // Always route visuals from the CURRENT question only.
            // Including prior lesson text here falsely rematches old assets
            // (e.g. "class" → "Class blueprint → objects" on a cryptography follow-up).
            prompt,
            topicHint: topicHint || undefined,
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

      const beatScope = {
        beatId: beat.id,
        beatOrder: beat.order,
        totalBeats: plan.beats.length,
      };
      yield {
        type: "pipeline_status",
        stage: "narration",
        state: "started",
        scope: beatScope,
      };
      const alignedNarration = formatNarrationForDisplay(
        narrationMatchingBoard({
          steps: threePlan ? undefined : activePlan?.boardScript?.steps,
          beatOrder: beat.order,
          totalBeats: plan.beats.length,
          fallback: beat.narration,
        }),
      );

      if (!threePlan && !usesTopicBoard) {
        // Every 2D beat draws something — 3D lessons update their live scene.
        if (!drawSessionStarted) {
          drawSessionStarted = true;
          boardLayout = createBoardLayout(sectionOffsetY);
          if (generatedVisualCommands.length) {
            reserve(boardLayout, {
              id: "generated-scene",
              x: 60,
              y: sectionOffsetY + 62,
              w: 780,
              h: 527,
              kind: "content",
            });
          }
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
          narration: alignedNarration,
          highlight: beat.highlight,
          prompt: umlPrompt,
          umlPlan,
          umlRevealed,
          layout: boardLayout,
          beatKind: beat.kind,
        });

        // Let the writing breathe across the narration instead of racing it.
        beatDrawCmds = paceCommandsToNarration(beatDrawCmds, alignedNarration);
        if (generatedVisualPending) {
          beatDrawCmds = [...generatedVisualCommands, ...beatDrawCmds];
          generatedVisualPending = false;
        }

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
        text: alignedNarration,
        beatId: beat.id,
      };

      const speechUnits = buildSpeechUnits(
        alignedNarration,
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
            : alignedNarration,
        t0: speechUnits[0]?.cueT0 ?? Math.max(0, drawClockMs - 200),
        beatId: beat.id,
      };
      yield {
        type: "pipeline_status",
        stage: "narration",
        state: "completed",
        scope: beatScope,
      };

      if (conversationId) {
        await appendTurn({
          conversationId,
          lessonId,
          role: "tutor",
          content: alignedNarration,
          meta: { beatId: beat.id, kind: beat.kind },
        });
      }

      if (withAudio) {
        yield {
          type: "pipeline_status",
          stage: "audio",
          state: "started",
          scope: beatScope,
          total: speechUnits.length,
        };
        // Synthesize the whole beat at once so units play back-to-back
        // instead of leaving a TTS gap between sentences.
        const clips = await Promise.allSettled(
          speechUnits.map((unit) => synthesizeSpeech(unit.text)),
        );

        const completedClips = clips.filter(
          (clip) => clip.status === "fulfilled",
        ).length;
        yield completedClips === 0 && speechUnits.length
          ? {
              type: "pipeline_status",
              stage: "audio",
              state: "failed",
              scope: beatScope,
              reason: "upstream_error",
              completed: 0,
              total: speechUnits.length,
              recoverable: true,
            }
          : {
              type: "pipeline_status",
              stage: "audio",
              state: "completed",
              scope: beatScope,
              reason:
                completedClips < speechUnits.length ? "partial" : undefined,
              completed: completedClips,
              total: speechUnits.length,
            };

        for (const [i, unit] of speechUnits.entries()) {
          const clip = clips[i];
          if (clip?.status !== "fulfilled") continue;
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
        if (speechUnits.length && completedClips === 0) {
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
    yield {
      type: "pipeline_status",
      stage: "persistence",
      state: "started",
    };

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

    const completionUpdate = await supabase
      .from("lessons")
      .update({ status: "completed", human_summary: plan.humanSummary })
      .eq("id", lessonId);
    if (completionUpdate.error) {
      console.error(
        "[lesson-stream] lesson completion update failed",
        completionUpdate.error.message,
      );
      yield {
        type: "pipeline_status",
        stage: "persistence",
        state: "failed",
        reason: "upstream_error",
        recoverable: true,
      };
    } else {
      yield {
        type: "pipeline_status",
        stage: "persistence",
        state: "completed",
      };
    }

    yield { type: "done", conversationId, lessonId };
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
