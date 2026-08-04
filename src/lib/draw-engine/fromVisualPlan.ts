import type { DrawCommand } from "@/lib/draw-engine/commands";
import { DRAW_CANVAS_HEIGHT } from "@/lib/draw-engine/commands";
import type { BoardScript, BoardScriptStep } from "@/lib/schemas/boardScript";
import {
  assertNoOverlaps,
  createBoardLayout,
  dropCollidingChips,
  footerChipCommands,
  measureTextBlock,
  placeContent,
  reserve,
  type BoardLayout,
} from "@/lib/draw-engine/boardLayout";
import { decideBoardVisualStrategy } from "@/lib/draw-engine/decideBoardVisual";
import { topicDiagramCommands } from "@/lib/draw-engine/topicDiagrams";
import {
  sketchAwareLeftX,
  topicSketchCommands,
} from "@/lib/draw-engine/topicSketches";
import { revealUmlPlanCommands } from "@/lib/draw-engine/umlReveal";
import type { UmlDiagramPlan } from "@/lib/draw-engine/umlSchema";
import { revealThroughStepIndex } from "@/lib/visuals/library/scriptReveal";
import type { VisualPlan } from "@/lib/visuals/types";

export type { BoardLayout };
export { createBoardLayout };

export type DrawAdaptOptions = {
  t0Base?: number;
  beatId?: string;
  beatOrder?: number;
  totalBeats?: number;
  includeChrome?: boolean;
  progressive?: boolean;
  narration?: string;
  highlight?: string;
  prompt?: string;
  layout?: BoardLayout;
};

type LayoutSlot = { x: number; y: number; w: number; h: number };

/**
 * Convert a VisualPlan into timed draw-engine commands.
 * Prefer `commandsForBeat` during lessons so every narration beat draws more.
 */
export function visualPlanToDrawCommands(
  plan: VisualPlan,
  options: DrawAdaptOptions = {},
): DrawCommand[] {
  return commandsForBeat({
    plan,
    beatOrder: options.beatOrder ?? 1,
    totalBeats: options.totalBeats,
    beatId: options.beatId ?? `b${options.beatOrder ?? 1}`,
    t0Base: options.t0Base ?? 0,
    includeChrome: options.includeChrome ?? true,
    progressive: options.progressive ?? false,
    narration: options.narration,
    highlight: options.highlight,
    prompt: options.prompt,
    layout: options.layout,
  });
}

export type BeatDrawInput = {
  plan: VisualPlan | null;
  beatOrder: number;
  totalBeats?: number;
  beatId: string;
  t0Base: number;
  includeChrome?: boolean;
  progressive?: boolean;
  narration?: string;
  highlight?: string;
  /** Original lesson prompt — used to pick structured diagram templates. */
  prompt?: string;
  /** Pre-generated full UML JSON; revealed beat-by-beat when present. */
  umlPlan?: UmlDiagramPlan | null;
  umlRevealed?: Set<string>;
  /** Session occupancy map — never draw on top of reserved space. */
  layout?: BoardLayout;
  /** Lesson beat kind — used to skip yellow summary boxes. */
  beatKind?: string;
};

/**
 * Draw commands for one lesson beat.
 * Prefer pre-generated UML JSON reveal, then other structured diagrams.
 */
export function commandsForBeat(input: BeatDrawInput): DrawCommand[] {
  const {
    plan,
    beatOrder,
    totalBeats,
    beatId,
    t0Base,
    includeChrome = beatOrder <= 1,
    progressive = true,
    narration,
    highlight,
    prompt = "",
    umlPlan,
    umlRevealed,
    layout,
    beatKind,
  } = input;

  // 0) Pre-generated UML plan — authoritative; never mix with heuristics.
  if (umlPlan && umlRevealed) {
    const { commands, newlyRevealed } = revealUmlPlanCommands({
      plan: umlPlan,
      beatOrder,
      beatId,
      t0Base,
      narration,
      highlight,
      alreadyRevealed: umlRevealed,
      layout,
    });
    for (const id of newlyRevealed) umlRevealed.add(id);
    const cleaned = dropCollidingChips(commands);
    assertNoOverlaps(cleaned, `uml-beat-${beatOrder}`);
    return cleaned;
  }

  // 1) Topic templates only when strategy says so (avoid random UML heuristics).
  const strategy = decideBoardVisualStrategy({
    prompt,
    hasUmlPlan: Boolean(umlPlan),
    hasBoardScript: Boolean(plan?.boardScript?.steps?.length),
  });

  if (strategy !== "uml" && strategy !== "narration") {
    const topicCmds = topicDiagramCommands({
      prompt,
      beatOrder,
      totalBeats,
      beatId,
      t0Base,
      narration,
      highlight,
      layout,
    });
    if (topicCmds?.length) {
      const cleaned = dropCollidingChips(topicCmds);
      assertNoOverlaps(cleaned, `topic-beat-${beatOrder}`);
      return cleaned;
    }
  }

  const cmds: DrawCommand[] = [];
  let t = t0Base;

  // Local stroke sketches for known topics.
  if (strategy === "sketch") {
    const sketchCmds = topicSketchCommands({
      prompt,
      beatOrder,
      beatId,
      t0Base: t,
      layout,
    });
    if (sketchCmds?.length) {
      cmds.push(...sketchCmds);
      t = Math.max(t + 200, drawCommandsEndMs(sketchCmds) + 80);
    }
  }

  // 2) Progressive board-script steps (complete sentences when scripted).
  if (plan?.boardScript?.steps?.length) {
    const scriptCmds = boardScriptBeatCommands({
      script: plan.boardScript,
      formula: includeChrome ? plan.formula : undefined,
      includeChrome,
      beatOrder,
      totalBeats,
      progressive,
      prefix: beatId,
      t0Base: t,
      layout,
      leftX: sketchAwareLeftX(prompt, layout),
      skipYellowBox:
        beatKind === "recap" ||
        beatKind === "human_summary" ||
        /\bin summary\b|\bto summarize\b|\btakeaway\b/i.test(
          narration ?? "",
        ),
    });
    cmds.push(...scriptCmds);
    if (scriptCmds.length) t = drawCommandsEndMs(scriptCmds);
  } else if (
    includeChrome &&
    plan &&
    strategy !== "narration" &&
    // Template metaphor labels belong on TemplateStage, not as Konva text.
    // Dumping them here is how "Class blueprint → objects" leaked onto other lessons.
    plan.renderer !== "template"
  ) {
    const chrome = chromeCommands(plan, t, beatId, narration, highlight, layout);
    cmds.push(...chrome);
    if (chrome.length) t = drawCommandsEndMs(chrome);
  }

  // 3) Footer chips: only clean short keywords — never truncated sentences.
  // Skip on summary/recap so we don't flash chrome during "in summary".
  const skipChrome =
    beatKind === "recap" ||
    beatKind === "human_summary" ||
    /\bin summary\b|\bto summarize\b|\btakeaway\b/i.test(narration ?? "");
  const chipText = skipChrome ? null : cleanChipKeyword(highlight, narration);
  if (chipText) {
    if (layout) {
      cmds.push(
        ...footerChipCommands({
          layout,
          beatOrder,
          beatId,
          t0Base: t + 80,
          text: chipText,
        }),
      );
    } else {
      const chip = keywordChipLegacy({
        highlight: chipText,
        beatOrder,
        beatId,
        t0Base: t + 80,
      });
      if (chip) cmds.push(...chip);
    }
  }

  // 4) Always show something meaningful — never a random empty box/arrow.
  if (!cmds.length || strategy === "narration") {
    const narrCmds = narrationSentenceCommands({
      beatId,
      beatOrder,
      t0Base: cmds.length ? t + 80 : t0Base,
      narration,
      highlight,
      prompt,
      layout,
      leftX: sketchAwareLeftX(prompt, layout),
    });
    // If we already drew script content, only add narration when still empty.
    if (!cmds.length) {
      cmds.push(...narrCmds);
    }
  }

  if (!cmds.length) {
    cmds.push(
      ...narrationSentenceCommands({
        beatId,
        beatOrder,
        t0Base,
        narration: narration || prompt || "Let's build this idea step by step.",
        highlight,
        prompt,
        layout,
        leftX: 80,
      }),
    );
  }

  const cleaned = dropCollidingChips(cmds);
  assertNoOverlaps(cleaned, `beat-${beatOrder}`);
  return cleaned;
}

function chromeCommands(
  plan: VisualPlan,
  t0Base: number,
  prefix: string,
  narration?: string,
  highlight?: string,
  layout?: BoardLayout,
): DrawCommand[] {
  if (plan.renderer === "katex" && (plan.formula || plan.source)) {
    return formulaCommands(plan.formula || plan.source || "", t0Base, prefix);
  }
  if (plan.actions?.length) {
    return actionsToCommands(plan, t0Base, prefix);
  }
  // Prefer writing a real sentence over a decorative frame.
  const meaningful = narrationSentenceCommands({
    beatId: prefix,
    beatOrder: 1,
    t0Base,
    narration,
    highlight,
    prompt: plan.boardScript?.title || plan.formula || "",
    layout,
    leftX: 80,
  });
  if (meaningful.length) return meaningful;
  return labelOnlyCommands(plan, t0Base, prefix);
}

function boardScriptBeatCommands(input: {
  script: BoardScript;
  formula?: string;
  includeChrome: boolean;
  beatOrder: number;
  totalBeats?: number;
  progressive: boolean;
  prefix: string;
  t0Base: number;
  layout?: BoardLayout;
  leftX?: number;
  /** Skip yellow highlight "box" steps (summary/recap). */
  skipYellowBox?: boolean;
}): DrawCommand[] {
  const {
    script: rawScript,
    formula,
    includeChrome,
    beatOrder,
    totalBeats,
    progressive,
    prefix,
    t0Base,
    layout,
    leftX = 80,
    skipYellowBox = false,
  } = input;

  const script = sanitizeBoardScript(rawScript);
  const allSteps = script.steps;
  const through = revealThroughStepIndex({
    steps: allSteps,
    beatOrder: Math.max(beatOrder, 1),
    totalBeats,
  });
  const prev = progressive
    ? revealThroughStepIndex({
        steps: allSteps,
        beatOrder: Math.max(beatOrder - 1, 0),
        totalBeats,
      })
    : 0;

  // Ensure we always emit at least the newly revealed slice.
  const cmds: DrawCommand[] = [];
  let t = t0Base;
  const left = leftX;
  const slots = new Map<string, LayoutSlot>();
  let lastWriteId: string | null = null;
  let cursorY =
    layout?.contentCursorY ?? (includeChrome && formula ? 146 : 90);

  // Replay prior steps for layout only (no emit) — sync into occupancy map.
  for (let i = 0; i < prev; i += 1) {
    const step = allSteps[i]!;
    const id = stepId(prefix, step, i);
    const next = layoutStep(step, id, left, cursorY, slots, lastWriteId, layout);
    cursorY = next.cursorY;
    lastWriteId = next.lastWriteId;
  }

  if (includeChrome && script.title) {
    const titleId = `${prefix}-title`;
    const titleY = (layout?.sectionOffsetY ?? 0) + 36;
    if (!layout?.occupied.some((o) => o.id === "board-title")) {
      cmds.push({
        id: titleId,
        type: "text",
        t0: t,
        durationMs: 450,
        text: script.title.slice(0, 80),
        x: left,
        y: titleY,
        color: "#1a2b3c",
        fontSize: 26,
      });
      if (layout) {
        reserve(layout, {
          id: "board-title",
          x: left,
          y: titleY - 6,
          w: Math.min(720, 24 + script.title.length * 12),
          h: 32,
          kind: "title",
        });
        layout.contentCursorY = Math.max(
          layout.contentCursorY,
          titleY + 54,
        );
        cursorY = Math.max(cursorY, titleY + 54);
      }
      t += 400;
    }
  }

  if (includeChrome && formula) {
    const formulaId = `${prefix}-formula`;
    if (!layout?.occupied.some((o) => o.id === "board-formula")) {
      cmds.push({
        id: formulaId,
        type: "text",
        t0: t,
        durationMs: 500,
        text: formula.slice(0, 80),
        x: left,
        y: 90,
        color: "#1b6ca8",
        fontSize: 22,
      });
      if (layout) {
        reserve(layout, {
          id: "board-formula",
          x: left,
          y: 84,
          w: Math.min(720, 24 + formula.length * 11),
          h: 30,
          kind: "title",
        });
        layout.contentCursorY = Math.max(layout.contentCursorY, 130);
        cursorY = Math.max(cursorY, 130);
      }
      t += 450;
    }
  }

  for (let i = prev; i < through; i += 1) {
    const step = allSteps[i]!;
    const id = stepId(prefix, step, i);
    const emitted = emitStep(
      step,
      id,
      left,
      cursorY,
      slots,
      lastWriteId,
      t,
      layout,
      skipYellowBox,
    );
    cmds.push(...emitted.cmds);
    cursorY = emitted.cursorY;
    lastWriteId = emitted.lastWriteId;
    t = emitted.t;
  }

  if (layout) {
    layout.contentCursorY = Math.max(layout.contentCursorY, cursorY);
  }

  return cmds;
}

function stepId(prefix: string, step: BoardScriptStep, i: number): string {
  if (step.type === "pause") return `${prefix}-pause-${i}`;
  // Stable across beats so the occupancy map can find prior writes.
  return step.id ?? `script-s${i}`;
}

/**
 * Drop orphan / nonsense arrows (e.g. label "unless" with no two writes to connect).
 * Keep only connector arrows that sit between two write steps.
 */
function sanitizeBoardScript(script: BoardScript): BoardScript {
  const raw = script.steps;
  const cleaned: BoardScriptStep[] = [];

  for (let i = 0; i < raw.length; i += 1) {
    const step = raw[i]!;
    if (step.type !== "arrow") {
      cleaned.push(step);
      continue;
    }

    const label = step.label?.trim() ?? "";
    if (label && !isConnectorLabel(label)) {
      // Content fragments don't belong on arrows — promote multi-word phrases to notes.
      if (label.split(/\s+/).length >= 3) {
        cleaned.push({
          type: "note",
          text: label.slice(0, 160),
          beat: step.beat,
        });
      }
      continue;
    }

    const hasPrevWrite = cleaned.some((s) => s.type === "write");
    const hasNextWrite = raw.slice(i + 1).some((s) => s.type === "write");
    if (!hasPrevWrite || !hasNextWrite) continue;

    cleaned.push(step);
  }

  if (cleaned.filter((s) => s.type === "write" || s.type === "note").length < 1) {
    return script;
  }
  return { ...script, steps: cleaned };
}

/** Labels that read as flow connectors — not content words like "unless". */
function isConnectorLabel(label: string): boolean {
  const l = label.trim().toLowerCase();
  if (!l) return true;
  if (
    /^(then|so|next|therefore|thus|hence|because|if|else|otherwise|implies|becomes|means|gives|leads to|equals|→|->|=>)$/i.test(
      l,
    )
  ) {
    return true;
  }
  // Short instructional connectors used in math transforms.
  if (
    /^(flip|multiply|divide|add|subtract|use reciprocal|multiply tops & bottoms|ask|inside|around|geometry)$/i.test(
      l,
    )
  ) {
    return true;
  }
  // Allow short "then …" phrases.
  if (/^(then|so|next|therefore)\b/.test(l) && l.length <= 28) return true;
  return false;
}

function layoutStep(
  step: BoardScriptStep,
  id: string,
  left: number,
  cursorY: number,
  slots: Map<string, LayoutSlot>,
  lastWriteId: string | null,
  layout?: BoardLayout,
): { cursorY: number; lastWriteId: string | null } {
  switch (step.type) {
    case "write": {
      const existing = layout?.occupied.find((o) => o.id === id);
      if (existing) {
        slots.set(id, {
          x: existing.x,
          y: existing.y,
          w: existing.w,
          h: existing.h,
        });
        return {
          cursorY: Math.max(cursorY, existing.y + existing.h + 14),
          lastWriteId: id,
        };
      }
      const lines = wrapBoardText(step.text, left < 100 ? 42 : 52);
      const lineH = 24;
      const { w, h } = measureTextBlock(lines, 18, lineH);
      const boxW = Math.min(left < 100 ? 440 : 720, w);
      if (layout) {
        const placed = placeContent(layout, id, boxW, h, left);
        if (placed) {
          slots.set(id, { x: placed.x, y: placed.y, w: boxW, h });
          return {
            cursorY: Math.max(cursorY, placed.y + h + 14),
            lastWriteId: id,
          };
        }
      }
      slots.set(id, { x: left, y: cursorY, w: boxW, h });
      return { cursorY: cursorY + h + 14, lastWriteId: id };
    }
    case "note":
      return {
        cursorY: Math.min(cursorY + 40, DRAW_CANVAS_HEIGHT - 80),
        lastWriteId,
      };
    case "arrow": {
      const from = lastWriteId ? slots.get(lastWriteId) : undefined;
      const y1 = from ? from.y + from.h : cursorY - 20;
      const y2 = Math.min(y1 + 48, DRAW_CANVAS_HEIGHT - 40);
      return { cursorY: Math.max(cursorY, y2 + 24), lastWriteId };
    }
    default:
      return { cursorY, lastWriteId };
  }
}

function emitStep(
  step: BoardScriptStep,
  id: string,
  left: number,
  cursorY: number,
  slots: Map<string, LayoutSlot>,
  lastWriteId: string | null,
  t0: number,
  layout?: BoardLayout,
  skipYellowBox = false,
): {
  cmds: DrawCommand[];
  cursorY: number;
  lastWriteId: string | null;
  t: number;
} {
  const cmds: DrawCommand[] = [];
  let t = t0;
  let y = cursorY;
  let last = lastWriteId;

  switch (step.type) {
    case "write": {
      const fontSize = step.style === "equation" ? 22 : 18;
      const lineH = fontSize + 6;
      const lines = wrapBoardText(step.text, left < 100 ? 42 : 52);
      const { w, h } = measureTextBlock(lines, fontSize, lineH);
      const boxW = Math.min(left < 100 ? 440 : 720, w);
      let slot: LayoutSlot = { x: left, y, w: boxW, h };
      if (layout) {
        const placed = placeContent(layout, id, boxW, h, left);
        if (!placed) {
          // Still emit below cursor with forced coords so teaching continues,
          // but never on top of an existing reservation in-column.
          return { cmds, cursorY: y, lastWriteId: last, t };
        }
        slot = { x: placed.x, y: placed.y, w: boxW, h };
        y = placed.y;
      }
      slots.set(id, slot);
      last = id;
      lines.forEach((line, i) => {
        cmds.push({
          id: i === 0 ? id : `${id}-l${i}`,
          type: "text",
          t0: t + i * 80,
          durationMs: 550,
          text: line,
          x: slot.x,
          y: slot.y + i * lineH,
          color: step.style === "emphasis" ? "#b86a1e" : "#1a2b3c",
          fontSize,
        });
      });
      y = slot.y + h + 14;
      t += 650 + lines.length * 60;
      break;
    }
    case "note": {
      const fontSize = 15;
      const lineH = fontSize + 7;
      const lines = wrapBoardText(step.text, left < 100 ? 40 : 50);
      const { w, h } = measureTextBlock(lines, fontSize, lineH);
      const boxW = Math.min(left < 100 ? 420 : 680, w);
      let nx = left + 12;
      let ny = Math.min(y, DRAW_CANVAS_HEIGHT - 80);
      if (layout) {
        const placed = placeContent(layout, id, boxW, h, left + 12);
        if (!placed) {
          return { cmds, cursorY: y, lastWriteId: last, t };
        }
        nx = placed.x;
        ny = placed.y;
      }
      lines.forEach((line, i) => {
        cmds.push({
          id: i === 0 ? id : `${id}-n${i}`,
          type: "text",
          t0: t + i * 60,
          durationMs: 500,
          text: line,
          x: nx,
          y: ny + i * lineH,
          color: "#5a6a7a",
          fontSize,
        });
      });
      y = ny + h + 10;
      t += 550 + lines.length * 40;
      break;
    }
    case "arrow": {
      // Only draw a connector from a prior write — never a floating orphan arrow.
      const from = last ? slots.get(last) : undefined;
      if (!from) {
        break;
      }
      const x = from.x + Math.min(40, Math.floor(from.w / 2));
      const y1 = from.y + from.h + 6;
      const y2 = y1 + 40;
      const bottomLimit =
        layout?.contentBottom ?? DRAW_CANVAS_HEIGHT - 40;
      // Never invert (upward) or draw off the section.
      if (y2 > bottomLimit) {
        break;
      }
      cmds.push({
        id,
        type: "arrow",
        t0: t,
        durationMs: 600,
        x1: x,
        y1,
        x2: x,
        y2,
        color: "#1b6ca8",
        width: 3,
      });
      const label = step.label?.trim();
      if (label && isConnectorLabel(label)) {
        const lblId = `${id}-lbl`;
        const lw = Math.min(200, 16 + label.length * 9);
        let lx = x + 14;
        let ly = y1 + 10;
        if (layout) {
          const placed = placeContent(layout, lblId, lw, 22, x + 14);
          // Keep the label next to the arrow — ignore far placements.
          if (
            placed &&
            Math.abs(placed.y - (y1 + 10)) < 60 &&
            Math.abs(placed.x - (x + 14)) < 120
          ) {
            lx = placed.x;
            ly = placed.y;
          }
        }
        cmds.push({
          id: lblId,
          type: "text",
          t0: t + 200,
          durationMs: 400,
          text: label,
          x: lx,
          y: ly,
          color: "#1b6ca8",
          fontSize: 16,
        });
      }
      y = Math.max(y, y2 + 16);
      t += 700;
      break;
    }
    case "box": {
      // Summary / recap beats: never flash the yellow card.
      if (skipYellowBox) {
        break;
      }
      const targetId = step.targetId ?? last;
      const slot = targetId ? slots.get(targetId) : undefined;
      const x = slot?.x ?? left;
      const by = slot?.y ?? y;
      const w = slot?.w ?? 280;
      const h = slot?.h ?? 44;
      // Soft blue emphasis — not a yellow flash card.
      cmds.push({
        id: `${id}-rect`,
        type: "rect",
        t0: t,
        durationMs: 450,
        x: x - 8,
        y: by - 6,
        w: w + 16,
        h: h + 12,
        color: "#1b6ca8",
        width: 2,
      });
      if (step.text) {
        cmds.push({
          id: `${id}-txt`,
          type: "text",
          t0: t + 150,
          durationMs: 400,
          text: step.text,
          x,
          y: by + h + 8,
          color: "#1a2b3c",
          fontSize: 16,
        });
      }
      t += 550;
      break;
    }
    case "cross_out": {
      const targetId = step.targetId ?? last;
      const slot = targetId ? slots.get(targetId) : undefined;
      if (slot) {
        cmds.push({
          id,
          type: "line",
          t0: t,
          durationMs: 450,
          x1: slot.x,
          y1: slot.y + slot.h / 2,
          x2: slot.x + slot.w,
          y2: slot.y + slot.h / 2,
          color: "#c24545",
          width: 3,
        });
      }
      t += 500;
      break;
    }
    case "pause": {
      const ms = step.ms ?? 350;
      cmds.push({ id, type: "pause", t0: t, durationMs: ms });
      t += ms;
      break;
    }
    default:
      break;
  }

  return { cmds, cursorY: y, lastWriteId: last, t };
}

function keywordChipLegacy(input: {
  highlight?: string;
  narration?: string;
  beatOrder: number;
  beatId: string;
  t0Base: number;
}): DrawCommand[] | null {
  const chip = cleanChipKeyword(input.highlight, input.narration);
  if (!chip) return null;

  const x = 80 + ((input.beatOrder - 1) % 3) * 260;
  const y = 520;
  const prefix = input.beatId;

  return [
    {
      id: `${prefix}-chip-blank`,
      type: "rect",
      t0: input.t0Base,
      durationMs: 80,
      x: x - 2,
      y: y - 2,
      w: 254,
      h: 48,
      color: "#f3f5f7",
      width: 1,
      fill: "#f3f5f7",
    },
    {
      id: `${prefix}-chip-box`,
      type: "rect",
      t0: input.t0Base + 40,
      durationMs: 350,
      x,
      y,
      w: Math.min(240, 28 + chip.length * 10),
      h: 34,
      color: "#1b6ca8",
      width: 1.5,
      fill: "rgba(27,108,168,0.08)",
    },
    {
      id: `${prefix}-chip`,
      type: "text",
      t0: input.t0Base + 80,
      durationMs: 400,
      text: chip,
      x: x + 10,
      y: y + 8,
      color: "#1a2b3c",
      fontSize: 15,
    },
  ];
}

/** Only emit chips for clean 1–3 word keywords — never mid-sentence scraps. */
function cleanChipKeyword(
  highlight?: string,
  narration?: string,
): string | null {
  const h = (highlight ?? "").trim();
  if (h) {
    const words = h.split(/\s+/);
    if (
      words.length <= 3 &&
      h.length <= 24 &&
      !/^(what|how|why|when|where|this|that|as|the|a|an)\b/i.test(h) &&
      !/\b(does|is|are|was|were|expan)/i.test(h)
    ) {
      return h;
    }
    // Highlight like "Big Bang Theory" is fine even if longer phrase of known concepts
    if (/^(big bang(?: theory)?|singularity|photosynthesis|water cycle)$/i.test(h)) {
      return h.slice(0, 22);
    }
  }

  const blob = `${highlight ?? ""} ${narration ?? ""}`;
  const known = blob.match(
    /\b(Big Bang(?: Theory)?|singularity|expansion|photosynthesis|water cycle)\b/i,
  );
  if (known?.[1]) return known[1].slice(0, 22);
  return null;
}

function wrapBoardText(text: string, maxChars: number): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return [cleaned.slice(0, 120)];
  const words = cleaned.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4).map((l) => l.slice(0, 120));
}

/**
 * Write the tutor’s actual sentence(s) onto the board with coordinate reservation.
 * Replaces the old random box + arrow fallback.
 */
function narrationSentenceCommands(input: {
  beatId: string;
  beatOrder: number;
  t0Base: number;
  narration?: string;
  highlight?: string;
  prompt?: string;
  layout?: BoardLayout;
  leftX?: number;
}): DrawCommand[] {
  const left = input.leftX ?? 80;
  const raw =
    pickSentence(input.narration) ||
    pickSentence(input.highlight) ||
    pickSentence(input.prompt) ||
    "Let's break this idea into clear steps.";

  const sentence = ensureSentence(raw).slice(0, 160);
  const fontSize = 18;
  const lineH = fontSize + 6;
  const lines = wrapBoardText(sentence, left < 100 ? 42 : 52);
  const { w, h } = measureTextBlock(lines, fontSize, lineH);
  const boxW = Math.min(left < 100 ? 440 : 720, w);
  const id = `${input.beatId}-narr`;

  let x = left;
  let y = 100 + ((input.beatOrder - 1) % 5) * 70;
  if (input.layout) {
    const placed = placeContent(input.layout, id, boxW, h, left);
    if (!placed) return [];
    x = placed.x;
    y = placed.y;
  }

  const cmds: DrawCommand[] = [];
  lines.forEach((line, i) => {
    cmds.push({
      id: i === 0 ? id : `${id}-l${i}`,
      type: "text",
      t0: input.t0Base + i * 80,
      durationMs: 550,
      text: line,
      x,
      y: y + i * lineH,
      color: "#1a2b3c",
      fontSize,
    });
  });
  return cmds;
}

function pickSentence(text?: string): string | null {
  if (!text?.trim()) return null;
  const cleaned = text.replace(/\s+/g, " ").trim();
  // Prefer first full sentence.
  const m = cleaned.match(/^[^.!?]+[.!?]?/);
  const s = (m?.[0] ?? cleaned).trim();
  if (s.length < 8) return null;
  return s;
}

function ensureSentence(text: string): string {
  const t = text.trim();
  if (!t) return t;
  if (/[.!?]$/.test(t)) return t;
  // Don't force a period onto equations.
  if (/[=+\-*/^]/.test(t) && t.split(/\s+/).length <= 6) return t;
  return `${t}.`;
}

function labelOnlyCommands(
  plan: VisualPlan,
  t0Base: number,
  prefix: string,
): DrawCommand[] {
  const label =
    plan.boardScript?.title ||
    plan.formula ||
    plan.source?.slice(0, 80) ||
    "Key idea";
  return [
    {
      id: `${prefix}-label`,
      type: "text",
      t0: t0Base,
      durationMs: 600,
      text: ensureSentence(label).slice(0, 100),
      x: 100,
      y: 200,
      color: "#1a2b3c",
      fontSize: 22,
    },
  ];
}

function formulaCommands(
  formula: string,
  t0Base: number,
  prefix: string,
): DrawCommand[] {
  return [
    {
      id: `${prefix}-eq`,
      type: "text",
      t0: t0Base + 100,
      durationMs: 600,
      text: formula.slice(0, 80),
      x: 120,
      y: 220,
      color: "#1a2b3c",
      fontSize: 26,
    },
  ];
}

function actionsToCommands(
  plan: VisualPlan,
  t0Base: number,
  prefix: string,
): DrawCommand[] {
  const cmds: DrawCommand[] = [];
  let t = t0Base;
  let y = 120;

  for (let i = 0; i < plan.actions.length; i += 1) {
    const action = plan.actions[i]!;
    const id = `${prefix}-a${i}`;
    switch (action.type) {
      case "write":
      case "label": {
        const text = action.text;
        cmds.push({
          id,
          type: "text",
          t0: t,
          durationMs: 500,
          text: text.slice(0, 80),
          x: action.type === "write" ? (action.x ?? 80) : 80,
          y: action.type === "write" ? (action.y ?? y) : y,
          color: "#1a2b3c",
          fontSize: 20,
        });
        y += 48;
        t += 550;
        break;
      }
      case "arrow": {
        // VisualPlan arrows are anchor-based (fromAnchor/direction), not pixel
        // endpoints. Without a template resolver they become random shafts
        // (e.g. an upward arrow into the title). Skip them.
        const label = action.label?.trim();
        if (label && !isConnectorLabel(label) && label.split(/\s+/).length >= 3) {
          cmds.push({
            id,
            type: "text",
            t0: t,
            durationMs: 450,
            text: label.slice(0, 80),
            x: 96,
            y,
            color: "#5a6a7a",
            fontSize: 15,
          });
          y += 36;
          t += 500;
        }
        break;
      }
      case "highlight": {
        // Need an anchor box — skip freestanding yellow flashes.
        break;
      }
      case "clear": {
        cmds.push({ id, type: "clear", t0: t, durationMs: 0 });
        t += 100;
        break;
      }
      default:
        break;
    }
  }

  if (!cmds.length) {
    return labelOnlyCommands(plan, t0Base, prefix);
  }
  return cmds;
}

/** End time of a command batch on the shared clock. */
export function drawCommandsEndMs(commands: DrawCommand[]): number {
  let end = 0;
  for (const c of commands) {
    end = Math.max(end, c.t0 + (c.durationMs || 0));
  }
  return end;
}
