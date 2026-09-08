"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { normalizeKatexSource } from "@/lib/math/latexToBoardText";
import {
  BoardNarration,
  type BoardNarrationLine,
} from "@/components/board/BoardNarration";
import { BoardScriptStage } from "@/components/board/BoardScriptStage";
import { InfiniteCanvas } from "@/components/board/InfiniteCanvas";
import { RoughSketch } from "@/components/RoughSketch";
import { TemplateStage } from "@/components/board/TemplateStage";
import { TopicBoard } from "@/components/topics/TopicBoard";
import type { DrawCommandQueue } from "@/lib/draw-engine/resolve";
import type { AnatomyStructureId } from "@/lib/anatomy/types";
import type { SceneRecipe } from "@/lib/schemas/sceneRecipe";
import type { ThreeScenePlan } from "@/lib/three-scenes/decide";
import { getVisualAsset } from "@/lib/visuals/assets/catalog";
import type { VisualPlan } from "@/lib/visuals/types";
import { visualStableKey } from "@/lib/visuals/router";
import type { LessonSource } from "@/types/lesson";

const KonvaDrawStage = dynamic(
  () =>
    import("@/components/draw-engine/KonvaDrawStage").then(
      (m) => m.KonvaDrawStage,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-chalk font-sans text-sm text-muted">
        Loading draw engine…
      </div>
    ),
  },
);

const ThreeBoard = dynamic(
  () =>
    import("@/components/board/ThreeBoard").then((m) => m.ThreeBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center bg-[#f7fafc] font-sans text-sm text-muted">
        Loading 3D…
      </div>
    ),
  },
);

type TutorBoardProps = {
  plan: VisualPlan | null;
  playKey: number;
  title?: string;
  beatOrder?: number;
  totalBeats?: number;
  narrationLines?: BoardNarrationLine[];
  sources?: LessonSource[];
  codeBuffer?: string;
  streaming?: boolean;
  onDrawComplete?: () => void;
  drawQueue?: DrawCommandQueue;
  drawSessionKey?: number;
  drawPlaying?: boolean;
  drawSpeed?: number;
  preferDrawEngine?: boolean;
  drawSpeech?: string | null;
  canvasHeight?: number;
  scrollToY?: number | null;
  threeScene?: ThreeScenePlan | null;
  threePlaying?: boolean;
  threeSpeed?: number;
  threeSelectedStructure?: AnatomyStructureId | null;
  onThreeSelect?: (structure: AnatomyStructureId | null) => void;
  onDrawClock?: (ms: number) => void;
  followUpValue?: string;
  onFollowUpChange?: (value: string) => void;
  onFollowUpSubmit?: () => void;
  followUpDisabled?: boolean;
  showFollowUp?: boolean;
};

/**
 * Full-bleed infinite canvas + side narration panel.
 */
export function TutorBoard({
  plan,
  playKey,
  title,
  beatOrder = 1,
  totalBeats,
  narrationLines = [],
  sources = [],
  codeBuffer,
  streaming,
  onDrawComplete,
  drawQueue,
  drawSessionKey = 0,
  drawPlaying = false,
  drawSpeed = 1,
  preferDrawEngine = false,
  drawSpeech = null,
  canvasHeight,
  scrollToY = null,
  threeScene = null,
  threePlaying = true,
  threeSpeed = 1,
  threeSelectedStructure = null,
  onThreeSelect,
  onDrawClock,
  followUpValue,
  onFollowUpChange,
  onFollowUpSubmit,
  followUpDisabled,
  showFollowUp,
}: TutorBoardProps) {
  const onDoneRef = useRef(onDrawComplete);
  useEffect(() => {
    onDoneRef.current = onDrawComplete;
  }, [onDrawComplete]);

  const showThree = Boolean(threeScene);
  // Curated interactives own their surface — they need drag, so they must not
  // sit inside the pan/zoom canvas, and pen strokes must not cover them.
  const showTopicBoard =
    !showThree &&
    plan?.renderer === "jsxgraph" &&
    Boolean(plan.topicId && plan.topicParams);
  const useDrawEngine =
    !showThree && !showTopicBoard && Boolean(preferDrawEngine && drawQueue);
  const companionAsset =
    plan?.assetId && !showThree && !showTopicBoard
      ? getVisualAsset(plan.assetId)
      : undefined;
  const companionTemplatePlan: VisualPlan | null =
    companionAsset && plan
      ? {
          ...plan,
          renderer: "template",
          assetId: companionAsset.id,
          actions:
            plan.actions?.some((a) => a.type === "draw")
              ? plan.actions
              : [
                  { type: "draw" },
                  {
                    type: "label",
                    anchor: "center",
                    text: companionAsset.title,
                  },
                ],
        }
      : null;
  const showTemplate =
    !showThree &&
    !useDrawEngine &&
    (plan?.renderer === "template" || Boolean(companionTemplatePlan));
  const showKatexOnly = !showThree && !useDrawEngine && plan?.renderer === "katex";
  const showMafs = !showThree && !useDrawEngine && plan?.renderer === "mafs";
  const showRough =
    !showThree &&
    !useDrawEngine &&
    (plan?.renderer === "rough" || plan?.renderer === "icon");
  const showBoardScript =
    !showThree &&
    !useDrawEngine &&
    plan?.renderer === "board_script" &&
    (plan.boardScript?.steps?.length ?? 0) > 0;
  const showMermaid =
    !showThree && !useDrawEngine && plan?.renderer === "mermaid";
  const showFigure = Boolean(
    useDrawEngine ||
      showTemplate ||
      showMafs ||
      showRough ||
      showKatexOnly ||
      showBoardScript ||
      showTopicBoard ||
      companionTemplatePlan,
  );
  const formula = plan?.formula ?? (showKatexOnly ? plan?.source : undefined);
  const topicBoardKey =
    showTopicBoard && plan?.topicId && plan.topicParams
      ? `topic-${plan.topicId}-${visualStableKey(plan)}`
      : "topic-idle";

  return (
    <section
      className="flex h-full min-h-0 w-full overflow-hidden bg-board"
      aria-label="Tutor whiteboard"
    >
      <div className="relative min-h-0 min-w-0 flex-1">
        {showThree && threeScene ? (
          <div className="absolute inset-0 flex flex-col bg-chalk">
            {drawSpeech ? (
              <p className="shrink-0 border-b border-board-edge/60 bg-accent-soft/30 px-4 py-2 font-sans text-sm text-ink">
                {drawSpeech}
              </p>
            ) : null}
            <div className="min-h-0 flex-1 p-2 md:p-3">
              <ThreeBoard
                plan={threeScene}
                playing={threePlaying}
                speed={threeSpeed}
                selectedStructure={threeSelectedStructure}
                focusStructures={
                  threeSelectedStructure ? [threeSelectedStructure] : []
                }
                onSelectStructure={onThreeSelect}
                showStructureControls={
                  threeScene.id === "cardiopulmonary" ||
                  threeScene.id === "eye"
                }
                className="h-full min-h-[280px] w-full overflow-hidden rounded-xl border border-board-edge bg-board"
              />
            </div>
          </div>
        ) : useDrawEngine && drawQueue ? (
          <div className="absolute inset-0 flex flex-col bg-chalk">
            {drawSpeech ? (
              <p className="shrink-0 border-b border-board-edge/60 bg-accent-soft/30 px-4 py-2 font-sans text-sm text-ink">
                {drawSpeech}
              </p>
            ) : null}
            {formula ? (
              <div className="shrink-0 border-b border-board-edge/50 bg-chalk/80 px-3 py-2">
                <FormulaStrip source={formula} playKey={playKey} />
              </div>
            ) : null}
            <div className="relative min-h-0 flex-1 p-2 md:p-3">
              <div className="relative h-full min-h-0 min-w-0">
                <KonvaDrawStage
                  queue={drawQueue}
                  sessionKey={drawSessionKey}
                  playing={drawPlaying}
                  speed={drawSpeed}
                  onClock={onDrawClock}
                  onComplete={onDrawComplete}
                  canvasHeight={canvasHeight}
                  scrollToY={scrollToY}
                  className="h-full min-h-[280px] w-full overflow-auto rounded-xl border border-board-edge bg-chalk"
                />
                {companionTemplatePlan ? (
                  <div className="pointer-events-none absolute top-5 right-5 z-20 aspect-4/3 w-[min(36%,320px)] overflow-hidden rounded-xl bg-white/88 p-3 shadow-[0_8px_28px_-14px_rgba(26,43,60,0.28)] backdrop-blur-sm">
                    <TemplateStage
                      plan={companionTemplatePlan}
                      playKey={playKey}
                      className="h-full max-h-none w-full max-w-none"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : showMermaid && plan?.source ? (
          <MermaidPane
            key={`m-${playKey}`}
            source={plan.source}
            onDone={() => onDoneRef.current?.()}
          />
        ) : (
          <InfiniteCanvas resetKey={`${playKey}-${plan?.renderer ?? "idle"}`}>
            {drawSpeech ? (
              <p className="mb-4 max-w-[min(640px,92vw)] rounded-lg border border-board-edge/60 bg-accent-soft/30 px-4 py-2 font-sans text-sm text-ink">
                {drawSpeech}
              </p>
            ) : null}

            {showFigure ? (
              <>
                {formula && showTopicBoard ? (
                  <div className="mb-4 w-full max-w-[min(640px,92vw)]">
                    <FormulaStrip source={formula} playKey={playKey} />
                  </div>
                ) : null}

                {showTopicBoard && plan?.topicId && plan.topicParams ? (
                  <TopicBoard
                    key={topicBoardKey}
                    topicId={plan.topicId}
                    params={plan.topicParams}
                    beatOrder={beatOrder}
                    compact
                    showTitle
                    onReady={() => onDoneRef.current?.()}
                    className="mb-6"
                  />
                ) : null}

                {showTemplate && (companionTemplatePlan || plan) ? (
                  <TemplateStage
                    plan={companionTemplatePlan ?? plan!}
                    playKey={playKey}
                    onDrawComplete={() => onDoneRef.current?.()}
                  />
                ) : null}

                {showMafs ? (
                  <MafsPanel
                    playKey={playKey}
                    source={plan?.source}
                    onDone={() => onDoneRef.current?.()}
                  />
                ) : null}

                {showBoardScript && plan?.boardScript ? (
                  <BoardScriptStage
                    key={`bs-${playKey}`}
                    script={plan.boardScript}
                    playKey={playKey}
                    beatOrder={beatOrder}
                    totalBeats={totalBeats}
                    onDrawComplete={() => onDoneRef.current?.()}
                  />
                ) : null}

                {showRough && !showBoardScript && plan ? (
                  <RoughPanel
                    plan={plan}
                    playKey={playKey}
                    onDone={() => onDoneRef.current?.()}
                  />
                ) : null}

                {formula && !showTopicBoard ? (
                  <FormulaStrip source={formula} playKey={playKey} />
                ) : null}
              </>
            ) : (
              <div className="flex flex-col items-center text-center">
                <p className="text-[1.25rem] font-semibold tracking-tight text-[#17324a]">
                  This is the board
                </p>
                <p className="mt-2 max-w-[16rem] text-[14px] leading-6 text-[#6a7d90]">
                  Ask above. Figures appear here. Notes stay on the right.
                </p>
              </div>
            )}
          </InfiniteCanvas>
        )}
      </div>

      <div className="hidden h-full w-[min(26rem,38vw)] shrink-0 sm:block">
        <BoardNarration
          lines={narrationLines}
          sources={sources}
          codeBuffer={codeBuffer}
          streaming={streaming}
          title={title}
          placement="side"
          followUpValue={followUpValue}
          onFollowUpChange={onFollowUpChange}
          onFollowUpSubmit={onFollowUpSubmit}
          followUpDisabled={followUpDisabled}
          showFollowUp={showFollowUp}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 sm:hidden">
        <BoardNarration
          lines={narrationLines}
          sources={sources}
          codeBuffer={codeBuffer}
          streaming={streaming}
          title={title}
          placement="bottom"
          followUpValue={followUpValue}
          onFollowUpChange={onFollowUpChange}
          onFollowUpSubmit={onFollowUpSubmit}
          followUpDisabled={followUpDisabled}
          showFollowUp={showFollowUp}
        />
      </div>
    </section>
  );
}

function MermaidPane({
  source,
  onDone,
}: {
  source: string;
  onDone: () => void;
}) {
  const editorRef = useRef<import("tldraw").Editor | null>(null);
  const lastRef = useRef("");
  const [ready, setReady] = useState(false);
  const [TldrawComp, setTldrawComp] = useState<
    typeof import("tldraw").Tldraw | null
  >(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await import("tldraw/tldraw.css");
      const mod = await import("tldraw");
      if (alive) setTldrawComp(() => mod.Tldraw);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !editorRef.current || !source.trim()) return;
    const editor = editorRef.current;
    const trimmed = source.trim();
    if (trimmed === lastRef.current) {
      onDone();
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const ids = [...editor.getCurrentPageShapeIds()];
        if (ids.length) editor.deleteShapes(ids);
        const { createMermaidDiagram } = await import("@tldraw/mermaid");
        await createMermaidDiagram(editor, trimmed);
        editor.zoomToFit({ animation: { duration: 200 } });
        lastRef.current = trimmed;
      } catch {
        /* still complete the beat */
      } finally {
        if (!cancelled) onDone();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, source, onDone]);

  if (!TldrawComp) {
    return (
      <div className="absolute inset-0 flex items-center justify-center font-sans text-sm text-muted">
        Loading flowchart…
      </div>
    );
  }

  const Tldraw = TldrawComp;
  return (
    <div className="absolute inset-0 z-10">
      <Tldraw
        onMount={(editor) => {
          editorRef.current = editor;
          setReady(true);
        }}
      />
    </div>
  );
}

function FormulaStrip({
  source,
  playKey,
}: {
  source: string;
  playKey: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const normalizedSource = normalizeKatexSource(source);
    try {
      katex.render(normalizedSource, ref.current, {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      ref.current.textContent = normalizedSource;
    }
  }, [source, playKey]);

  return (
    <div className="flex justify-center">
      <div
        ref={ref}
        className="rounded-xl border border-board-edge bg-chalk px-6 py-3 text-marker shadow-[var(--shadow-shell)]"
      />
    </div>
  );
}

function MafsPanel({
  onDone,
  playKey,
  source,
}: {
  onDone?: () => void;
  playKey: number;
  source?: string;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current?.(), 400);
    return () => clearTimeout(t);
  }, [playKey]);

  const kind = (source ?? "line").toLowerCase();
  const isParabola = /\bparabola|quadratic\b/.test(kind);
  const curve = isParabola
    ? "M40 40 Q160 200 280 40"
    : "M40 160 Q100 40, 160 110 T280 60";

  return (
    <svg
      viewBox="0 0 320 220"
      className="h-[280px] w-[420px] max-w-[86vw]"
      role="img"
      aria-label={isParabola ? "Parabola sketch" : "Coordinate sketch"}
    >
      <line x1="20" y1="110" x2="300" y2="110" stroke="#6a7d90" />
      <line x1="160" y1="20" x2="160" y2="200" stroke="#6a7d90" />
      <path d={curve} fill="none" stroke="#1b6ca8" strokeWidth="2.5" />
      {isParabola ? (
        <>
          <circle cx="100" cy="110" r="4" fill="#b86a1e" />
          <circle cx="220" cy="110" r="4" fill="#b86a1e" />
          <text x="92" y="128" fill="#4a6580" fontSize="11">
            roots
          </text>
        </>
      ) : null}
      <text x="270" y="100" fill="#4a6580" fontSize="12">
        x
      </text>
      <text x="170" y="35" fill="#4a6580" fontSize="12">
        y
      </text>
    </svg>
  );
}

function RoughPanel({
  plan,
  onDone,
  playKey,
}: {
  plan: VisualPlan;
  onDone?: () => void;
  playKey: number;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current?.(), 450);
    return () => clearTimeout(t);
  }, [playKey, plan.sceneRecipe]);

  const recipe: SceneRecipe = plan.sceneRecipe ?? {
    kind: "concept",
    label: writeLabel(plan),
    note: "sketch of the idea",
  };

  return (
    <div className="flex w-[560px] max-w-[86vw] items-center justify-center">
      <RoughSketch
        key={`${playKey}-${recipe.kind}-${recipe.label}`}
        recipe={recipe}
      />
    </div>
  );
}

function writeLabel(plan: VisualPlan): string {
  const writeAction = plan.actions?.find((a) => a.type === "write");
  if (writeAction && writeAction.type === "write") return writeAction.text;
  return plan.assetId ?? "idea";
}
