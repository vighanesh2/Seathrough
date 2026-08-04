"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import {
  BoardNarration,
  type BoardNarrationLine,
} from "@/components/board/BoardNarration";
import { BoardScriptStage } from "@/components/board/BoardScriptStage";
import { InfiniteCanvas } from "@/components/board/InfiniteCanvas";
import { RoughSketch } from "@/components/RoughSketch";
import { TemplateStage } from "@/components/board/TemplateStage";
import type { DrawCommandQueue } from "@/lib/draw-engine/resolve";
import type { AnatomyStructureId } from "@/lib/anatomy/types";
import type { SceneRecipe } from "@/lib/schemas/sceneRecipe";
import type { ThreeScenePlan } from "@/lib/three-scenes/decide";
import type { VisualPlan } from "@/lib/visuals/types";

const KonvaDrawStage = dynamic(
  () =>
    import("@/components/draw-engine/KonvaDrawStage").then(
      (m) => m.KonvaDrawStage,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-white font-sans text-sm text-muted">
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
  codeBuffer?: string;
  streaming?: boolean;
  onDrawComplete?: () => void;
  drawQueue?: DrawCommandQueue;
  drawSessionKey?: number;
  drawPlaying?: boolean;
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
  codeBuffer,
  streaming,
  onDrawComplete,
  drawQueue,
  drawSessionKey = 0,
  drawPlaying = false,
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
}: TutorBoardProps) {
  const onDoneRef = useRef(onDrawComplete);
  useEffect(() => {
    onDoneRef.current = onDrawComplete;
  }, [onDrawComplete]);

  const showThree = Boolean(threeScene);
  const useDrawEngine = !showThree && Boolean(preferDrawEngine && drawQueue);
  const showTemplate = !showThree && !useDrawEngine && plan?.renderer === "template";
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
      showBoardScript,
  );
  const formula = plan?.formula ?? (showKatexOnly ? plan?.source : undefined);

  return (
    <section
      className="flex h-full min-h-0 w-full overflow-hidden bg-board"
      aria-label="Tutor whiteboard"
    >
      <div className="relative min-h-0 min-w-0 flex-1">
        {showThree && threeScene ? (
          <div className="absolute inset-0 flex flex-col bg-white">
            {drawSpeech ? (
              <p className="shrink-0 border-b border-board-edge/60 bg-accent-soft/30 px-4 py-2 font-sans text-sm text-ink">
                <span className="font-semibold text-accent-deep">Tutor: </span>
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
                showStructureControls={threeScene.id === "cardiopulmonary"}
                className="h-full min-h-[280px] w-full overflow-hidden rounded-xl border border-board-edge bg-[#f7fafc]"
              />
            </div>
          </div>
        ) : useDrawEngine && drawQueue ? (
          <div className="absolute inset-0 flex flex-col bg-white">
            {drawSpeech ? (
              <p className="shrink-0 border-b border-board-edge/60 bg-accent-soft/30 px-4 py-2 font-sans text-sm text-ink">
                <span className="font-semibold text-accent-deep">Tutor: </span>
                {drawSpeech}
              </p>
            ) : null}
            <div className="relative min-h-0 flex-1 p-2 md:p-3">
              <KonvaDrawStage
                queue={drawQueue}
                sessionKey={drawSessionKey}
                playing={drawPlaying}
                onClock={onDrawClock}
                canvasHeight={canvasHeight}
                scrollToY={scrollToY}
                className="h-full min-h-[280px] w-full overflow-auto rounded-xl border border-board-edge bg-white"
              />
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
            {showFigure ? (
              <>
                {showTemplate && plan ? (
                  <TemplateStage
                    plan={plan}
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

                {showKatexOnly &&
                !showTemplate &&
                !showMafs &&
                !showRough &&
                !showBoardScript ? (
                  <div className="font-sans text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                    equation
                  </div>
                ) : null}

                {formula ? (
                  <FormulaStrip source={formula} playKey={playKey} />
                ) : null}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="font-display text-2xl text-marker-soft md:text-3xl">
                  Ask anything to begin
                </p>
                <p className="max-w-sm font-sans text-sm text-muted">
                  Pan and zoom freely — drawings appear on this infinite board.
                </p>
              </div>
            )}
          </InfiniteCanvas>
        )}
      </div>

      <div className="hidden h-full w-[min(380px,34vw)] shrink-0 md:block">
        <BoardNarration
          lines={narrationLines}
          codeBuffer={codeBuffer}
          streaming={streaming}
          title={title}
          placement="side"
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 md:hidden">
        <BoardNarration
          lines={narrationLines}
          codeBuffer={codeBuffer}
          streaming={streaming}
          title={title}
          placement="bottom"
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
    try {
      katex.render(source, ref.current, {
        throwOnError: false,
        displayMode: true,
      });
    } catch {
      ref.current.textContent = source;
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
