/**
 * Smoke checks for board occupancy / anti-overlap.
 * Run: npx tsx scripts/smoke-board-layout.ts
 */
import {
  createBoardLayout,
  findCommandOverlaps,
  footerChipCommands,
  FOOTER_SLOT_X,
  registerUmlOccupancy,
} from "../src/lib/draw-engine/boardLayout";
import { commandsForBeat } from "../src/lib/draw-engine/fromVisualPlan";
import {
  classBoxHeight,
  layoutUmlClassPlan,
  UML_BOX_WIDTH,
} from "../src/lib/draw-engine/umlLayout";
import { revealUmlPlanCommands } from "../src/lib/draw-engine/umlReveal";
import type { UmlDiagramPlan } from "../src/lib/draw-engine/umlSchema";
import type { VisualPlan } from "../src/lib/visuals/types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// --- Footer chips: slot blank/replace ---
{
  const layout = createBoardLayout();
  const all = [];
  for (let beat = 1; beat <= 6; beat++) {
    const cmds = footerChipCommands({
      layout,
      beatOrder: beat,
      beatId: `b${beat}`,
      t0Base: beat * 1000,
      text:
        beat % 2 === 0
          ? "The Big Bang Theory explains origins"
          : "As the universe expanded rapidly",
    });
    all.push(...cmds);
    assert(
      cmds.some((c) => c.id.includes("blank")),
      `beat ${beat} missing blank`,
    );
    const text = cmds.find((c) => c.type === "text");
    assert(!!text && text.text.split(/\s+/).length <= 3, "chip too long");
    assert((text?.text.length ?? 99) <= 22, "chip over 22 chars");
  }
  const slot0Texts = all.filter(
    (c) => c.type === "text" && c.x === FOOTER_SLOT_X[0] + 10,
  );
  assert(slot0Texts.length === 2, `expected 2 slot0 texts, got ${slot0Texts.length}`);
  const hits = findCommandOverlaps(all);
  assert(hits.length === 0, `footer overlaps: ${JSON.stringify(hits.slice(0, 3))}`);
  console.log("ok footer chips");
}

// --- Board script + chips across beats ---
{
  const layout = createBoardLayout();
  const script = {
    title: "Big Bang Theory",
    steps: [
      { type: "write" as const, text: "Big Bang" },
      { type: "write" as const, text: "Explosion" },
      { type: "arrow" as const },
      { type: "write" as const, text: "Universe" },
      { type: "note" as const, text: "13.8 billion yrs ago" },
      { type: "write" as const, text: "Expansion" },
    ],
  };
  const plan = { renderer: "rough", boardScript: script } as VisualPlan;
  const accumulated = [];
  for (let beat = 1; beat <= 6; beat++) {
    accumulated.push(
      ...commandsForBeat({
        plan,
        beatOrder: beat,
        totalBeats: 6,
        beatId: `bb${beat}`,
        t0Base: beat * 2000,
        includeChrome: beat === 1,
        progressive: true,
        narration: "The Big Bang Theory explains how the universe began.",
        highlight:
          beat === 4 ? "As the universe expanded" : "Big Bang Theory",
        layout,
      }),
    );
  }
  const hits = findCommandOverlaps(accumulated);
  assert(
    hits.length === 0,
    `board+chip overlaps: ${JSON.stringify(hits.slice(0, 5))}`,
  );
  // Occupancy map has content + chips
  assert(layout.occupied.length >= 4, "layout should reserve content");
  console.log("ok board script + chips");
}

// --- UML layout + reveal ---
{
  let uml: UmlDiagramPlan = {
    title: "Vehicle",
    kind: "class",
    domain: "Vehicle",
    classes: [
      {
        id: "c1",
        name: "Vehicle",
        attributes: ["- make: String"],
        methods: [],
        x: 100,
        y: 80,
        revealBeat: 1,
      },
      {
        id: "c2",
        name: "Car",
        attributes: ["- doors: Integer"],
        methods: [],
        x: 100,
        y: 200,
        revealBeat: 2,
      },
      {
        id: "c3",
        name: "Truck",
        attributes: ["- cap: Integer"],
        methods: [],
        x: 300,
        y: 200,
        revealBeat: 2,
      },
    ],
    relationships: [
      {
        id: "r1",
        from: "c2",
        to: "c1",
        kind: "inheritance",
        label: "extends",
        revealBeat: 3,
      },
      {
        id: "r2",
        from: "c3",
        to: "c1",
        kind: "inheritance",
        label: "extends",
        revealBeat: 3,
      },
    ],
    actors: [],
    messages: [],
  };
  uml = layoutUmlClassPlan(uml);
  const boxes = uml.classes.map((c) => ({
    id: c.id,
    x: c.x,
    y: c.y,
    w: UML_BOX_WIDTH,
    h: classBoxHeight(c),
  }));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const hit = !(
        a.x + a.w + 8 <= b.x ||
        b.x + b.w + 8 <= a.x ||
        a.y + a.h + 8 <= b.y ||
        b.y + b.h + 8 <= a.y
      );
      assert(!hit, `UML boxes overlap ${a.id} ${b.id}`);
    }
  }

  const layout = createBoardLayout();
  registerUmlOccupancy(
    layout,
    uml.classes.map((c) => ({
      id: `uml-${c.id}`,
      x: c.x,
      y: c.y,
      w: UML_BOX_WIDTH,
      h: classBoxHeight(c),
    })),
    [],
  );
  const revealed = new Set<string>();
  const umlCmds = [];
  for (let beat = 1; beat <= 4; beat++) {
    const { commands, newlyRevealed } = revealUmlPlanCommands({
      plan: uml,
      beatOrder: beat,
      beatId: `u${beat}`,
      t0Base: beat * 1000,
      alreadyRevealed: revealed,
      layout,
    });
    newlyRevealed.forEach((id) => revealed.add(id));
    umlCmds.push(...commands);
  }
  const hits = findCommandOverlaps(umlCmds);
  assert(hits.length === 0, `uml overlaps: ${JSON.stringify(hits.slice(0, 5))}`);
  console.log("ok uml layout + reveal");
}

console.log("all board-layout smoke checks passed");
