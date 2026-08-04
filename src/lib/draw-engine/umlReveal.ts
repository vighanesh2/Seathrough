import type { DrawCommand } from "@/lib/draw-engine/commands";
import {
  registerUmlOccupancy,
  reserve,
  type BoardLayout,
} from "@/lib/draw-engine/boardLayout";
import {
  UML_BOX_WIDTH,
  classBoxHeight,
  computeUmlEdges,
  type UmlEdgeGeom,
} from "@/lib/draw-engine/umlLayout";
import type {
  UmlClassNode,
  UmlDiagramPlan,
  UmlRelationship,
} from "@/lib/draw-engine/umlSchema";

export type RevealUmlOptions = {
  plan: UmlDiagramPlan;
  beatOrder: number;
  beatId: string;
  t0Base: number;
  narration?: string;
  highlight?: string;
  /** Ids already drawn in prior beats. */
  alreadyRevealed: Set<string>;
  layout?: BoardLayout;
};

/**
 * Reveal the next slice of a pre-generated UML plan for this beat.
 * Mentions in narration can pull a class forward early.
 * If nothing matches this beat, still reveal the next scheduled piece so drawing never stalls.
 */
export function revealUmlPlanCommands(options: RevealUmlOptions): {
  commands: DrawCommand[];
  newlyRevealed: string[];
} {
  const {
    plan,
    beatOrder,
    beatId,
    t0Base,
    narration = "",
    highlight = "",
    alreadyRevealed,
    layout,
  } = options;

  const mentionBlob = `${narration} ${highlight}`.toLowerCase();
  const newlyRevealed: string[] = [];
  const cmds: DrawCommand[] = [];
  let t = t0Base;
  const edges =
    plan.kind === "class" ? computeUmlEdges(plan) : new Map<string, UmlEdgeGeom>();

  if (beatOrder <= 1 && !alreadyRevealed.has("__title__")) {
    cmds.push({
      id: `${beatId}-uml-title`,
      type: "text",
      t0: t,
      durationMs: 450,
      text: `${plan.domain} · ${plan.kind === "sequence" ? "sequence" : "class"} diagram`.slice(
        0,
        80,
      ),
      x: 80,
      y: 36,
      color: "#1a2b3c",
      fontSize: 22,
    });
    if (layout) {
      reserve(layout, {
        id: "uml-title",
        x: 80,
        y: 30,
        w: 400,
        h: 28,
        kind: "title",
      });
    }
    newlyRevealed.push("__title__");
    t += 400;
  }

  if (plan.kind === "class") {
    for (const cls of plan.classes) {
      if (alreadyRevealed.has(cls.id)) continue;
      const due =
        cls.revealBeat <= beatOrder || nameMentioned(cls.name, mentionBlob);
      if (!due) continue;
      cmds.push(...classToCommands(cls, beatId, t));
      newlyRevealed.push(cls.id);
      if (layout) {
        registerUmlOccupancy(
          layout,
          [
            {
              id: `uml-${cls.id}`,
              x: cls.x,
              y: cls.y,
              w: UML_BOX_WIDTH,
              h: classBoxHeight(cls),
            },
          ],
          [],
        );
      }
      t += 550;
    }

    if (!newlyRevealed.some((id) => plan.classes.some((c) => c.id === id))) {
      const next = [...plan.classes]
        .filter((c) => !alreadyRevealed.has(c.id))
        .sort(
          (a, b) =>
            a.revealBeat - b.revealBeat || a.name.localeCompare(b.name),
        )[0];
      if (next) {
        cmds.push(...classToCommands(next, beatId, t));
        newlyRevealed.push(next.id);
        if (layout) {
          registerUmlOccupancy(
            layout,
            [
              {
                id: `uml-${next.id}`,
                x: next.x,
                y: next.y,
                w: UML_BOX_WIDTH,
                h: classBoxHeight(next),
              },
            ],
            [],
          );
        }
        t += 550;
      }
    }

    for (const rel of plan.relationships) {
      if (alreadyRevealed.has(rel.id)) continue;
      const endsReady =
        (alreadyRevealed.has(rel.from) || newlyRevealed.includes(rel.from)) &&
        (alreadyRevealed.has(rel.to) || newlyRevealed.includes(rel.to));
      const due =
        rel.revealBeat <= beatOrder || labelMentioned(rel, mentionBlob);
      if (!endsReady || !due) continue;
      const geom = edges.get(rel.id);
      if (!geom) continue;
      cmds.push(...edgeToCommands(geom, beatId, t));
      newlyRevealed.push(rel.id);
      if (layout) {
        registerUmlOccupancy(layout, [], [
          {
            id: `uml-lbl-${rel.id}`,
            x: geom.labelX,
            y: geom.labelY,
            w: Math.min(120, 16 + geom.label.length * 8),
            h: 18,
          },
        ]);
      }
      t += 500;
    }

    const allClassesOut = plan.classes.every(
      (c) => alreadyRevealed.has(c.id) || newlyRevealed.includes(c.id),
    );
    if (
      allClassesOut &&
      !newlyRevealed.some((id) => plan.relationships.some((r) => r.id === id))
    ) {
      const nextRel = [...plan.relationships]
        .filter((r) => !alreadyRevealed.has(r.id))
        .filter(
          (r) =>
            (alreadyRevealed.has(r.from) || newlyRevealed.includes(r.from)) &&
            (alreadyRevealed.has(r.to) || newlyRevealed.includes(r.to)),
        )
        .sort((a, b) => a.revealBeat - b.revealBeat)[0];
      if (nextRel) {
        const geom = edges.get(nextRel.id);
        if (geom) {
          cmds.push(...edgeToCommands(geom, beatId, t));
          newlyRevealed.push(nextRel.id);
          if (layout) {
            registerUmlOccupancy(layout, [], [
              {
                id: `uml-lbl-${nextRel.id}`,
                x: geom.labelX,
                y: geom.labelY,
                w: Math.min(120, 16 + geom.label.length * 8),
                h: 18,
              },
            ]);
          }
          t += 500;
        }
      }
    }
  } else {
    for (const actor of plan.actors) {
      if (alreadyRevealed.has(actor.id)) continue;
      const due =
        actor.revealBeat <= beatOrder || nameMentioned(actor.name, mentionBlob);
      if (!due) continue;
      cmds.push(...actorToCommands(actor, beatId, t));
      newlyRevealed.push(actor.id);
      t += 450;
    }

    if (!newlyRevealed.some((id) => plan.actors.some((a) => a.id === id))) {
      const next = [...plan.actors]
        .filter((a) => !alreadyRevealed.has(a.id))
        .sort((a, b) => a.revealBeat - b.revealBeat)[0];
      if (next) {
        cmds.push(...actorToCommands(next, beatId, t));
        newlyRevealed.push(next.id);
        t += 450;
      }
    }

    for (const msg of plan.messages) {
      if (alreadyRevealed.has(msg.id)) continue;
      const endsReady =
        (alreadyRevealed.has(msg.from) || newlyRevealed.includes(msg.from)) &&
        (alreadyRevealed.has(msg.to) || newlyRevealed.includes(msg.to));
      const due =
        msg.revealBeat <= beatOrder || nameMentioned(msg.label, mentionBlob);
      if (!endsReady || !due) continue;
      const from = plan.actors.find((a) => a.id === msg.from);
      const to = plan.actors.find((a) => a.id === msg.to);
      if (!from || !to) continue;
      cmds.push(
        {
          id: `${beatId}-${msg.id}`,
          type: "arrow",
          t0: t,
          durationMs: 550,
          x1: from.x,
          y1: msg.y,
          x2: to.x,
          y2: msg.y,
          color: "#1b6ca8",
          width: 2.5,
        },
        {
          id: `${beatId}-${msg.id}-lbl`,
          type: "text",
          t0: t + 150,
          durationMs: 400,
          text: msg.label.slice(0, 40),
          x: Math.min(from.x, to.x) + 20,
          y: msg.y - 22,
          color: "#1b6ca8",
          fontSize: 14,
        },
      );
      newlyRevealed.push(msg.id);
      t += 500;
    }

    if (!newlyRevealed.some((id) => plan.messages.some((m) => m.id === id))) {
      const nextMsg = [...plan.messages]
        .filter((m) => !alreadyRevealed.has(m.id))
        .filter(
          (m) =>
            (alreadyRevealed.has(m.from) || newlyRevealed.includes(m.from)) &&
            (alreadyRevealed.has(m.to) || newlyRevealed.includes(m.to)),
        )
        .sort((a, b) => a.revealBeat - b.revealBeat || a.y - b.y)[0];
      if (nextMsg) {
        const from = plan.actors.find((a) => a.id === nextMsg.from);
        const to = plan.actors.find((a) => a.id === nextMsg.to);
        if (from && to) {
          cmds.push(
            {
              id: `${beatId}-${nextMsg.id}`,
              type: "arrow",
              t0: t,
              durationMs: 550,
              x1: from.x,
              y1: nextMsg.y,
              x2: to.x,
              y2: nextMsg.y,
              color: "#1b6ca8",
              width: 2.5,
            },
            {
              id: `${beatId}-${nextMsg.id}-lbl`,
              type: "text",
              t0: t + 150,
              durationMs: 400,
              text: nextMsg.label.slice(0, 40),
              x: Math.min(from.x, to.x) + 20,
              y: nextMsg.y - 22,
              color: "#1b6ca8",
              fontSize: 14,
            },
          );
          newlyRevealed.push(nextMsg.id);
        }
      }
    }
  }

  return { commands: cmds, newlyRevealed };
}

function nameMentioned(name: string, blob: string): boolean {
  const n = name.trim().toLowerCase();
  if (n.length < 2) return false;
  return new RegExp(`\\b${escapeReg(n)}\\b`, "i").test(blob);
}

function labelMentioned(rel: UmlRelationship, blob: string): boolean {
  if (rel.label && nameMentioned(rel.label, blob)) return true;
  return nameMentioned(rel.kind, blob);
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function classToCommands(
  cls: UmlClassNode,
  beatId: string,
  t0: number,
): DrawCommand[] {
  const rows = [...cls.attributes.slice(0, 4), ...cls.methods.slice(0, 4)];
  const h = classBoxHeight(cls);
  const w = UML_BOX_WIDTH;
  const cmds: DrawCommand[] = [
    {
      id: `${beatId}-${cls.id}-box`,
      type: "rect",
      t0,
      durationMs: 500,
      x: cls.x,
      y: cls.y,
      w,
      h,
      color: "#1a2b3c",
      width: 2.5,
      fill: "rgba(255,255,255,0.95)",
    },
    {
      id: `${beatId}-${cls.id}-div`,
      type: "line",
      t0: t0 + 100,
      durationMs: 300,
      x1: cls.x,
      y1: cls.y + 30,
      x2: cls.x + w,
      y2: cls.y + 30,
      color: "#1a2b3c",
      width: 1.5,
    },
    {
      id: `${beatId}-${cls.id}-name`,
      type: "text",
      t0: t0 + 120,
      durationMs: 400,
      text: cls.name.slice(0, 28),
      x: cls.x + 14,
      y: cls.y + 8,
      color: "#1a2b3c",
      fontSize: 17,
    },
  ];
  rows.forEach((row, i) => {
    cmds.push({
      id: `${beatId}-${cls.id}-r${i}`,
      type: "text",
      t0: t0 + 200 + i * 60,
      durationMs: 350,
      text: row.slice(0, 40),
      x: cls.x + 12,
      y: cls.y + 38 + i * 18,
      color: "#4a6580",
      fontSize: 13,
    });
  });
  return cmds;
}

function edgeToCommands(
  geom: UmlEdgeGeom,
  beatId: string,
  t0: number,
): DrawCommand[] {
  const cmds: DrawCommand[] = [];
  const pts = geom.points;
  if (pts.length < 2) return cmds;

  for (let i = 0; i < pts.length - 2; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    cmds.push({
      id: `${beatId}-${geom.relId}-s${i}`,
      type: "line",
      t0: t0 + i * 40,
      durationMs: 350,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      color: "#1b6ca8",
      width: 2.5,
    });
  }
  const a = pts[pts.length - 2]!;
  const b = pts[pts.length - 1]!;
  cmds.push({
    id: `${beatId}-${geom.relId}`,
    type: "arrow",
    t0: t0 + Math.max(0, pts.length - 2) * 40,
    durationMs: 550,
    x1: a.x,
    y1: a.y,
    x2: b.x,
    y2: b.y,
    color: "#1b6ca8",
    width: 2.5,
  });
  cmds.push({
    id: `${beatId}-${geom.relId}-lbl`,
    type: "text",
    t0: t0 + 150,
    durationMs: 400,
    text: geom.label.slice(0, 28),
    x: geom.labelX,
    y: geom.labelY,
    color: "#1b6ca8",
    fontSize: 13,
  });
  return cmds;
}

function actorToCommands(
  actor: { id: string; name: string; x: number },
  beatId: string,
  t0: number,
): DrawCommand[] {
  return [
    {
      id: `${beatId}-${actor.id}-box`,
      type: "rect",
      t0,
      durationMs: 450,
      x: actor.x - 40,
      y: 70,
      w: 80,
      h: 36,
      color: "#1a2b3c",
      width: 2,
      fill: "rgba(255,255,255,0.95)",
    },
    {
      id: `${beatId}-${actor.id}-name`,
      type: "text",
      t0: t0 + 100,
      durationMs: 350,
      text: actor.name.slice(0, 12),
      x: actor.x - 28,
      y: 80,
      color: "#1a2b3c",
      fontSize: 14,
    },
    {
      id: `${beatId}-${actor.id}-life`,
      type: "line",
      t0: t0 + 150,
      durationMs: 400,
      x1: actor.x,
      y1: 110,
      x2: actor.x,
      y2: 420,
      color: "#6a7d90",
      width: 1.5,
    },
  ];
}
