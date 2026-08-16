import type { DrawCommand } from "@/lib/draw-engine/commands";
import {
  DRAW_CANVAS_HEIGHT,
  DRAW_CANVAS_WIDTH,
  drawCommandSchema,
} from "@/lib/draw-engine/commands";
import {
  commandsForBeat,
  createBoardLayout,
  drawCommandsEndMs,
} from "@/lib/draw-engine/fromVisualPlan";
import {
  layoutExtentY,
  registerUmlOccupancy,
} from "@/lib/draw-engine/boardLayout";
import {
  UML_BOX_WIDTH,
  classBoxHeight,
} from "@/lib/draw-engine/umlLayout";
import {
  shouldGenerateUmlPlan,
  umlDiagramPlanSchema,
  type UmlDiagramPlan,
} from "@/lib/draw-engine/umlSchema";
import { generateUmlDiagramPlan } from "@/lib/draw-engine/generateUmlPlan";
import type { LessonPlanParsed } from "@/lib/schemas/lesson";
import {
  revealForBeat,
  threeSceneFromLessonPlan,
  threeScenePlanSchema,
  type ThreeScenePlan,
} from "@/lib/three-scenes/decide";
import { visualPlanSchema, type VisualPlan } from "@/lib/visuals/types";
import { getServiceSupabase } from "@/lib/supabase/server";
import { z } from "zod";

export const BOARD_SNAPSHOT_BEAT_ID = "__board_snapshot__";

export const lessonBoardSnapshotSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  prompt: z.string(),
  canvas: z.object({
    width: z.number(),
    height: z.number(),
  }),
  commands: z.array(drawCommandSchema).max(2000),
  visualPlan: visualPlanSchema.nullable(),
  threeScene: threeScenePlanSchema.nullable(),
  umlPlan: z.any().nullable().optional(),
});

export type LessonBoardSnapshot = {
  version: 1;
  title: string;
  prompt: string;
  canvas: { width: number; height: number };
  commands: DrawCommand[];
  visualPlan: VisualPlan | null;
  threeScene: ThreeScenePlan | null;
  umlPlan?: UmlDiagramPlan | null;
};

export function parseBoardSnapshot(raw: unknown): LessonBoardSnapshot | null {
  const parsed = lessonBoardSnapshotSchema.safeParse(raw);
  if (!parsed.success) return null;
  const uml =
    parsed.data.umlPlan == null
      ? null
      : umlDiagramPlanSchema.safeParse(parsed.data.umlPlan).success
        ? (parsed.data.umlPlan as UmlDiagramPlan)
        : (parsed.data.umlPlan as UmlDiagramPlan);
  return {
    version: 1,
    title: parsed.data.title,
    prompt: parsed.data.prompt,
    canvas: parsed.data.canvas,
    commands: parsed.data.commands,
    visualPlan: parsed.data.visualPlan,
    threeScene: parsed.data.threeScene,
    umlPlan: uml,
  };
}

/**
 * Persist the exact board that was streamed so reopen matches generate.
 */
export async function saveBoardSnapshot(
  lessonId: string,
  snapshot: LessonBoardSnapshot,
): Promise<void> {
  const supabase = getServiceSupabase();
  await supabase.from("lesson_beats").upsert(
    {
      lesson_id: lessonId,
      beat_id: BOARD_SNAPSHOT_BEAT_ID,
      beat_order: 10_000,
      kind: "board_snapshot",
      payload: { board: snapshot },
      diagram_action: "none",
    },
    { onConflict: "lesson_id,beat_id" },
  );
}

export async function loadBoardSnapshot(
  lessonId: string,
): Promise<LessonBoardSnapshot | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("lesson_beats")
    .select("payload")
    .eq("lesson_id", lessonId)
    .eq("beat_id", BOARD_SNAPSHOT_BEAT_ID)
    .maybeSingle();

  const payload = data?.payload as { board?: unknown } | null;
  return parseBoardSnapshot(payload?.board);
}

type BeatVisualRow = {
  beatOrder: number;
  beatId: string;
  kind: string;
  narration?: string;
  highlight?: string;
  visualPlan: VisualPlan | null;
};

/**
 * Rebuild a board when no snapshot exists (legacy conversations).
 * Uses saved per-beat visual plans when present so reopen matches what was resolved live.
 */
export async function rebuildBoardSnapshot(input: {
  prompt: string;
  plan: LessonPlanParsed;
  beatVisuals?: BeatVisualRow[];
  allowUmlGeneration?: boolean;
}): Promise<LessonBoardSnapshot> {
  const { prompt, plan } = input;
  const umlRevealed = new Set<string>();
  let umlPlan: UmlDiagramPlan | null = null;

  if (
    input.allowUmlGeneration !== false &&
    shouldGenerateUmlPlan(prompt)
  ) {
    try {
      umlPlan = await generateUmlDiagramPlan({
        prompt,
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
    } catch {
      umlPlan = null;
    }
  }

  let threePlan: ThreeScenePlan | null = null;
  if (!umlPlan) {
    threePlan = threeSceneFromLessonPlan(plan);
    if (threePlan) {
      threePlan = {
        ...threePlan,
        reveal: revealForBeat(threePlan, plan.beats.length, plan.beats.length),
      };
    }
  }

  const commands: DrawCommand[] = [];
  let drawClockMs = 0;
  let activePlan: VisualPlan | null = null;
  let canvasHeight = DRAW_CANVAS_HEIGHT;
  const boardLayout = createBoardLayout(0);

  if (threePlan) {
    return {
      version: 1,
      title: plan.title,
      prompt,
      canvas: { width: DRAW_CANVAS_WIDTH, height: DRAW_CANVAS_HEIGHT },
      commands: [],
      visualPlan: null,
      threeScene: threePlan,
      umlPlan: null,
    };
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

  const visualByOrder = new Map(
    (input.beatVisuals ?? []).map((row) => [row.beatOrder, row]),
  );

  for (const beat of plan.beats) {
    const saved = visualByOrder.get(beat.order);
    if (saved?.visualPlan) activePlan = saved.visualPlan;
    else if (beat.visual) activePlan = beat.visual;

    const drawCmds = commandsForBeat({
      plan: activePlan,
      beatOrder: beat.order,
      totalBeats: plan.beats.length,
      beatId: beat.id,
      t0Base: drawClockMs,
      includeChrome: beat.order <= 1,
      progressive: true,
      narration: beat.narration,
      highlight: beat.highlight,
      prompt,
      umlPlan,
      umlRevealed,
      layout: boardLayout,
      beatKind: beat.kind,
    });

    if (drawCmds.length) {
      commands.push(...drawCmds);
      drawClockMs = Math.max(
        drawClockMs + 400,
        drawCommandsEndMs(drawCmds) + 250,
      );
    }
  }

  canvasHeight = Math.max(
    DRAW_CANVAS_HEIGHT,
    layoutExtentY(boardLayout),
    commandsBottomExtent(commands) + 80,
  );

  return {
    version: 1,
    title: plan.title,
    prompt,
    canvas: { width: DRAW_CANVAS_WIDTH, height: canvasHeight },
    commands,
    visualPlan: activePlan,
    threeScene: null,
    umlPlan,
  };
}

function commandsBottomExtent(commands: DrawCommand[]): number {
  let max = 0;
  for (const cmd of commands) {
    switch (cmd.type) {
      case "text":
        max = Math.max(max, cmd.y + (cmd.fontSize ?? 18) * 1.6);
        break;
      case "rect":
      case "highlight":
      case "image":
        max = Math.max(max, cmd.y + cmd.h);
        break;
      case "circle":
        max = Math.max(max, cmd.y + cmd.radius);
        break;
      case "line":
      case "arrow":
        max = Math.max(max, cmd.y1, cmd.y2);
        break;
      case "stroke":
        for (const p of cmd.points) max = Math.max(max, p.y);
        break;
      default:
        break;
    }
  }
  return max;
}

/**
 * Load every lesson board for a conversation (follow-ups stack) and merge.
 */
export async function loadConversationBoard(input: {
  conversationId: string;
  rootPrompt: string;
}): Promise<{
  board: LessonBoardSnapshot | null;
  visualPlan: VisualPlan | null;
  threeScene: ThreeScenePlan | null;
}> {
  const supabase = getServiceSupabase();
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, prompt, title, plan, created_at")
    .eq("conversation_id", input.conversationId)
    .order("created_at", { ascending: true });

  if (!lessons?.length) {
    return { board: null, visualPlan: null, threeScene: null };
  }

  const mergedCommands: DrawCommand[] = [];
  let title = lessons[lessons.length - 1]?.title ?? "Lesson";
  let canvasHeight = DRAW_CANVAS_HEIGHT;
  let visualPlan: VisualPlan | null = null;
  let threeScene: ThreeScenePlan | null = null;
  let prompt = input.rootPrompt;

  for (const lesson of lessons) {
    const lessonId = lesson.id as string;
    prompt = (lesson.prompt as string) || prompt;
    title = (lesson.title as string) || title;

    let snapshot = await loadBoardSnapshot(lessonId);
    if (!snapshot) {
      const plan = lesson.plan as LessonPlanParsed | null;
      if (!plan?.beats?.length) continue;

      const { data: beatRows } = await supabase
        .from("lesson_beats")
        .select("beat_id, beat_order, kind, payload")
        .eq("lesson_id", lessonId)
        .neq("beat_id", BOARD_SNAPSHOT_BEAT_ID)
        .order("beat_order", { ascending: true });

      const beatVisuals: BeatVisualRow[] = (beatRows ?? []).map((row) => {
        const payload = row.payload as {
          beat?: { narration?: string; highlight?: string; id?: string };
          visualTrigger?: { plan?: VisualPlan | null };
        };
        return {
          beatOrder: row.beat_order as number,
          beatId: (payload.beat?.id as string) || (row.beat_id as string),
          kind: row.kind as string,
          narration: payload.beat?.narration,
          highlight: payload.beat?.highlight,
          visualPlan: payload.visualTrigger?.plan
            ? visualPlanSchema.safeParse(payload.visualTrigger.plan).success
              ? (payload.visualTrigger.plan as VisualPlan)
              : null
            : null,
        };
      });

      snapshot = await rebuildBoardSnapshot({
        prompt: (lesson.prompt as string) || input.rootPrompt,
        plan,
        beatVisuals,
        // Avoid surprising LLM cost/latency on every open when possible.
        allowUmlGeneration: shouldGenerateUmlPlan(
          (lesson.prompt as string) || input.rootPrompt,
        ),
      });

      // Best-effort backfill so the next open is instant and identical.
      try {
        await saveBoardSnapshot(lessonId, snapshot);
      } catch {
        // ignore
      }
    }

    if (snapshot.threeScene) {
      threeScene = snapshot.threeScene;
      visualPlan = null;
      // 3D owns the stage — don't keep stale draw cmds from earlier 2D lessons.
      mergedCommands.length = 0;
      continue;
    }

    if (snapshot.commands.length) {
      const prevEnd = mergedCommands.reduce(
        (m, c) => Math.max(m, c.t0 + (c.durationMs || 0)),
        0,
      );
      const minT = Math.min(...snapshot.commands.map((c) => c.t0));
      const base = mergedCommands.length ? prevEnd + 200 : 0;
      for (const cmd of snapshot.commands) {
        mergedCommands.push({
          ...cmd,
          t0: base + (cmd.t0 - minT),
        });
      }
      canvasHeight = Math.max(canvasHeight, snapshot.canvas.height);
    }
    if (snapshot.visualPlan) visualPlan = snapshot.visualPlan;
    threeScene = null;
  }

  if (threeScene) {
    return {
      board: {
        version: 1,
        title,
        prompt,
        canvas: { width: DRAW_CANVAS_WIDTH, height: DRAW_CANVAS_HEIGHT },
        commands: [],
        visualPlan: null,
        threeScene,
        umlPlan: null,
      },
      visualPlan: null,
      threeScene,
    };
  }

  if (!mergedCommands.length && !visualPlan) {
    return { board: null, visualPlan: null, threeScene: null };
  }

  return {
    board: {
      version: 1,
      title,
      prompt,
      canvas: {
        width: DRAW_CANVAS_WIDTH,
        height: Math.max(canvasHeight, commandsBottomExtent(mergedCommands) + 80),
      },
      commands: mergedCommands,
      visualPlan,
      threeScene: null,
      umlPlan: null,
    },
    visualPlan,
    threeScene: null,
  };
}
