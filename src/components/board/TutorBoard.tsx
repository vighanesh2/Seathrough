"use client";

import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { RoughSketch } from "@/components/RoughSketch";
import { TemplateStage } from "@/components/board/TemplateStage";
import type { SceneRecipe } from "@/lib/schemas/sceneRecipe";
import type { VisualPlan } from "@/lib/visuals/types";

type TutorBoardProps = {
  plan: VisualPlan | null;
  playKey: number;
  title?: string;
  onDrawComplete?: () => void;
};

/**
 * Figures (template / rough / mafs) render in their own layer — no tldraw underneath.
 * tldraw loads only for Mermaid flowcharts, so it cannot blank or cover drawings.
 */
export function TutorBoard({
  plan,
  playKey,
  title,
  onDrawComplete,
}: TutorBoardProps) {
  const onDoneRef = useRef(onDrawComplete);
  onDoneRef.current = onDrawComplete;

  const showTemplate = plan?.renderer === "template";
  const showKatexOnly = plan?.renderer === "katex";
  const showMafs = plan?.renderer === "mafs";
  const showRough = plan?.renderer === "rough" || plan?.renderer === "icon";
  const showMermaid = plan?.renderer === "mermaid";
  const showFigure = Boolean(
    showTemplate || showMafs || showRough || showKatexOnly,
  );
  const formula = plan?.formula ?? (showKatexOnly ? plan?.source : undefined);

  return (
    <section
      className="flex h-full min-h-[320px] flex-col overflow-hidden rounded-[var(--radius-shell)] border border-board-edge bg-board shadow-[var(--shadow-shell)]"
      aria-label="Tutor whiteboard"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#8fa398]">
            board
          </p>
          <h2 className="font-sans text-sm font-semibold text-[#eef3ef]">
            {title ?? "Waiting for a concept"}
          </h2>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] text-[#9aada3]">
          {plan?.renderer ?? "idle"}
          {plan?.assetId ? ` · ${plan.assetId}` : ""}
          {plan?.sceneRecipe?.kind ? ` · ${plan.sceneRecipe.kind}` : ""}
          {formula ? " · formula" : ""}
        </span>
      </header>

      <div className="relative min-h-[280px] flex-1 bg-[#1c2621]">
        {showMermaid && plan?.source ? (
          <MermaidPane
            key={`m-${playKey}`}
            source={plan.source}
            onDone={() => onDoneRef.current?.()}
          />
        ) : null}

        {!showMermaid && showFigure ? (
          <div className="absolute inset-0 z-20 flex flex-col bg-[radial-gradient(circle_at_30%_20%,rgba(125,206,160,0.08),transparent_45%),linear-gradient(180deg,#24312b,#1c2621)] p-4">
            <div className="flex min-h-[220px] flex-1 items-center justify-center">
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
                  onDone={() => onDoneRef.current?.()}
                />
              ) : null}

              {showRough && plan ? (
                <RoughPanel
                  plan={plan}
                  playKey={playKey}
                  onDone={() => onDoneRef.current?.()}
                />
              ) : null}

              {showKatexOnly && !showTemplate && !showMafs && !showRough ? (
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-[#8fa398]">
                  equation
                </div>
              ) : null}
            </div>

            {formula ? (
              <FormulaStrip source={formula} playKey={playKey} />
            ) : null}
          </div>
        ) : null}

        {!showMermaid && !showFigure ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#8fa398]">
              ask a question to draw
            </p>
          </div>
        ) : null}
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
      <div className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-[0.2em] text-[#8fa398]">
        loading flowchart…
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
    <div className="mt-2 flex shrink-0 justify-center border-t border-white/10 px-2 pt-3 pb-1">
      <div
        ref={ref}
        className="rounded-lg border border-white/10 bg-[#24312b]/80 px-5 py-2 text-[#eef3ef]"
      />
    </div>
  );
}

function MafsPanel({
  onDone,
  playKey,
}: {
  onDone?: () => void;
  playKey: number;
}) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current?.(), 400);
    return () => clearTimeout(t);
  }, [playKey]);

  return (
    <svg
      viewBox="0 0 320 220"
      className="h-[min(52vh,280px)] w-full max-w-[420px]"
      role="img"
      aria-label="Coordinate sketch"
    >
      <line x1="20" y1="110" x2="300" y2="110" stroke="#8fa398" />
      <line x1="160" y1="20" x2="160" y2="200" stroke="#8fa398" />
      <path
        d="M40 160 Q100 40, 160 110 T280 60"
        fill="none"
        stroke="#7dcea0"
        strokeWidth="2.5"
      />
      <text x="270" y="100" fill="#9aada3" fontSize="12">
        x
      </text>
      <text x="170" y="35" fill="#9aada3" fontSize="12">
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
  onDoneRef.current = onDone;

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
    <div className="flex h-full min-h-[240px] w-full max-w-[560px] items-center justify-center">
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
