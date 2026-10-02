import { formatIntakeAnswers } from "@/lib/experiment/systemDesign/answers";
import { compileSystemDesign } from "@/lib/experiment/systemDesign/compile";
import { changedSheets } from "@/lib/experiment/systemDesign/diff";
import { SPEC_SCHEMA } from "@/lib/experiment/systemDesign/generate";
import { completeDesignJson } from "@/lib/experiment/systemDesign/llm";
import {
  applyDesignOps,
  describeChange,
  hasStaleParts,
  parseDesignOps,
  relabelFlow,
  renameGroups,
  staleParts,
  unwantedNames,
  type DesignOp,
} from "@/lib/experiment/systemDesign/ops";
import { sectionLabel, type IntakeAnswers } from "@/lib/experiment/systemDesign/sections";
import {
  MAX_EDIT_HISTORY,
  clip,
  designGaps,
  type SystemDesignSpec,
} from "@/lib/experiment/systemDesign/spec";
import type { ExperimentLesson } from "@/lib/experiment/scene";

export type SystemDesignRevision =
  | {
      kind: "revised";
      spec: SystemDesignSpec;
      lesson: ExperimentLesson;
      summary: string;
      changed: string[];
      rejected: string[];
    }
  | { kind: "answer"; reply: string }
  | { kind: "new" };

/** A message that cannot become an edit. The route answers 422 with this text. */
export class RevisionRejected extends Error {}

const REVISE_SYSTEM = `You edit an existing system design that a student is looking at on a whiteboard.
The student sends one message. Decide what it is:
- "edit": a change to this design (swap a provider, add or remove a feature or component, fix a mistake in a diagram).
- "question": a question about this design that needs no change.
- "new": a request to design a different product from scratch.
Return ONLY JSON:
{ "intent": "edit|question|new", "ops": [], "summary": "one short sentence a tutor would say aloud, e.g. \\"Moved the database to RDS and sign-in to Cognito.\\"", "reply": "only for question: 2-3 sentences" }

The student's message overrides anything in their earlier answers.

The design has this shape:
${SPEC_SCHEMA}

Ops, applied in order. Ids are kebab-case and must exist in the current design unless you are adding one:
{ "op": "setTitle", "title": "" }
{ "op": "setStack", "key": "cloud|compute|database|cache|queue|realtime|auth|storage|cdn|observability", "value": "product, or empty to drop it" }
{ "op": "upsertBox", "id": "", "label": "", "column": "client|edge|service|data" }  (changes an existing id, or adds a new one)
{ "op": "removeBox", "id": "", "replaceWith": "optional id that takes over its connections" }
{ "op": "addArrow", "from": "", "to": "", "label": "" }
{ "op": "removeArrow", "from": "", "to": "" }
{ "op": "upsertTable", "id": "", "name": "", "fields": [], "store": "box id" }
{ "op": "removeTable", "id": "" }
{ "op": "setFlow", "steps": [ { "from": "", "to": "", "label": "" } ] }  (replaces the whole flow)
{ "op": "setPoints", "section": "scaling|reliability|security|observability", "points": [ { "target": "", "label": "", "then": "" } ] }  (replaces that section's points)
{ "op": "setDeployment", "groups": [ { "id": "", "label": "", "members": [] } ] }  (replaces deployment)
{ "op": "setSection", "id": "section id", "say": "", "example": "" }

Rules for an edit:
- Carry the change through the whole design: stack, boxes, arrows, tables, flow, points, deployment, and the say and example of every section that mentions what changed. Swapping a provider usually touches requirements, architecture, deployment, and every section that names the old product.
- To swap one component for another, keep its id and change its label with upsertBox, so its connections stay.
- A new feature needs its components, their arrows, any tables, and a sentence in the sections it affects.
- Change only what the message asks for and what follows from it. Leave everything else exactly as it is.
- A box label names the component's product, e.g. "RDS Postgres" or "Cognito", never only the cloud ("AWS").
- Deployment group labels, table names, point labels, and flow step labels must not name a product the design no longer uses.
- Labels under 22 characters. Never label anything N/A.`;

const FIX_TEXT_SYSTEM = `You fix leftovers in a system design after an edit, so everything matches what the student asked for.
Return ONLY JSON:
{ "stack": { "stack key": "replacement product" },
  "boxes": [ { "id": "box id", "label": "replacement product label" } ],
  "sections": [ { "id": "section id", "say": "2-4 sentences", "example": "the concrete artifact" } ],
  "groups": [ { "id": "deployment group id", "label": "new label" } ],
  "tables": [ { "id": "table id", "name": "new name" } ],
  "points": [ { "section": "scaling|reliability|security|observability", "points": [ { "target": "box id", "label": "", "then": "" } ] } ],
  "flow": [ { "index": 0, "label": "new step label" } ] }
Points replace that section's whole list, so return every point, fixed. Keep targets that exist in the current design.
Only include the parts you are asked to fix. Keep each section's meaning and length.
Stack choices and boxes you are asked to fix still use a product the student wants gone: pick the replacement that fits their message (for "AWS instead of Supabase", Supabase Auth becomes Cognito), and use the same product everywhere you name it. Box labels under 22 characters name the product, never only the cloud.
Otherwise name only products that are in the current stack and boxes.
The student changed their mind after the intake questions: where an answer disagrees with the current design, the current design wins.`;

function context(
  prompt: string,
  answers: IntakeAnswers,
  spec: SystemDesignSpec,
  edits: string[],
): string {
  const history = edits.length
    ? `\n\nChanges the student already asked for, oldest first. They override the answers above:\n${edits
        .map((edit, index) => `${index + 1}. ${edit}`)
        .join("\n")}`
    : "";
  return `Product:\n${prompt}\n\nStudent answers:\n${formatIntakeAnswers(answers)}${history}\n\nCurrent design:\n${JSON.stringify(spec)}`;
}

/**
 * One follow-up pass for whatever the edit left behind. A failed pass keeps
 * the edit as it was: it is already a valid design, just less tidy.
 */
async function fixStaleParts(
  before: SystemDesignSpec,
  after: SystemDesignSpec,
  instruction: string,
  ctx: (spec: SystemDesignSpec) => string,
  signal?: AbortSignal,
): Promise<SystemDesignSpec> {
  const stale = staleParts(before, after, unwantedNames(instruction, before));
  if (!hasStaleParts(stale)) return after;
  const asks = [
    ...stale.stack.map((item) => `stack ${item.key} "${item.value}"`),
    ...stale.boxes.map((item) => `box ${item.id} "${item.label}"`),
    ...stale.sections.map((item) => `section ${item.id} (still says: ${item.words.join(", ")})`),
    ...stale.groups.map((item) => `deployment group ${item.id} "${item.label}"`),
    ...stale.tables.map((item) => `table ${item.id} "${item.name}"`),
    ...stale.points.map((item) => `${item.section} points (still say: ${item.words.join(", ")})`),
    ...stale.flow.map((item) => `flow step ${item.index} "${item.label}"`),
  ];
  type FixReply = {
    stack?: unknown;
    boxes?: unknown;
    sections?: unknown;
    groups?: unknown;
    tables?: unknown;
    points?: unknown;
    flow?: unknown;
  };
  let raw: FixReply;
  try {
    raw = (await completeDesignJson(
      FIX_TEXT_SYSTEM,
      `${ctx(after)}\n\nStudent message:\n${instruction}\n\nThese parts still name products the student no longer wants. Fix them:\n${asks.join("\n")}`,
      { maxTokens: 2500, signal },
    )) as FixReply;
  } catch (error) {
    if (signal?.aborted) throw error;
    return after;
  }
  const records = (value: unknown) =>
    (Array.isArray(value) ? value : []).filter(
      (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
    );
  const stackReply =
    raw.stack && typeof raw.stack === "object" && !Array.isArray(raw.stack)
      ? Object.entries(raw.stack as Record<string, unknown>)
      : [];
  const ops: DesignOp[] = parseDesignOps([
    ...stackReply.map(([key, value]) => ({ op: "setStack", key, value })),
    ...records(raw.boxes).map((box) => ({ id: box.id, label: box.label, op: "upsertBox" })),
    ...records(raw.sections).map((section) => ({ ...section, op: "setSection" })),
    ...records(raw.tables).map((table) => ({ id: table.id, name: table.name, op: "upsertTable" })),
    ...records(raw.points).map((item) => ({ section: item.section, points: item.points, op: "setPoints" })),
  ]).ops.filter(
    (op) =>
      (op.op === "setStack" && op.value !== "" && stale.stack.some((item) => item.key === op.key)) ||
      (op.op === "upsertBox" && Boolean(op.label) && stale.boxes.some((item) => item.id === op.id)) ||
      (op.op === "setSection" && stale.sections.some((item) => item.id === op.id)) ||
      (op.op === "upsertTable" && stale.tables.some((item) => item.id === op.id)) ||
      (op.op === "setPoints" &&
        op.points.length > 0 &&
        stale.points.some((item) => item.section === op.section)),
  );
  const renamed = renameGroups(
    applyDesignOps(after, ops).spec,
    records(raw.groups)
      .map((group) => ({ id: String(group.id ?? ""), label: String(group.label ?? "") }))
      .filter((group) => stale.groups.some((item) => item.id === group.id)),
  );
  return relabelFlow(
    renamed,
    records(raw.flow)
      .map((step) => ({ index: Number(step.index), label: String(step.label ?? "") }))
      .filter((step) => stale.flow.some((item) => item.index === step.index)),
  );
}

export async function reviseSystemDesign(input: {
  prompt: string;
  answers: IntakeAnswers;
  spec: SystemDesignSpec;
  instruction: string;
  edits?: string[];
  signal?: AbortSignal;
}): Promise<SystemDesignRevision> {
  const { prompt, answers, spec, instruction, signal } = input;
  const edits = (input.edits ?? []).slice(-MAX_EDIT_HISTORY);
  const ctx = (current: SystemDesignSpec) => context(prompt, answers, current, edits);
  const raw = (await completeDesignJson(
    REVISE_SYSTEM,
    `${ctx(spec)}\n\nStudent message:\n${instruction}`,
    { maxTokens: 3000, temperature: 0.2, signal },
  )) as Record<string, unknown>;

  const intent = typeof raw.intent === "string" ? raw.intent.toLowerCase() : "edit";
  if (intent === "new") return { kind: "new" };
  if (intent === "question") {
    const reply = clip(raw.reply ?? raw.summary, 600);
    if (reply) return { kind: "answer", reply };
  }

  const parsed = parseDesignOps(raw.ops);
  const result = applyDesignOps(spec, parsed.ops);
  const rejected = [...parsed.rejected, ...result.rejected];
  if (!result.applied) {
    throw new RevisionRejected(
      "I couldn't change the design from that. Name the part to change, like \"use DynamoDB for messages\".",
    );
  }

  const fixed = await fixStaleParts(spec, result.spec, instruction, ctx, signal);
  const gaps = designGaps(fixed);
  if (gaps.length) {
    throw new RevisionRejected(
      `That change left ${gaps.map(sectionLabel).join(", ")} empty, so the design was kept as it was.`,
    );
  }

  const [before, lesson] = await Promise.all([
    compileSystemDesign(spec, prompt),
    compileSystemDesign(fixed, prompt),
  ]);
  const diff = changedSheets(before, lesson);
  const changed = [...new Set([...diff.shapes, ...diff.text])];
  if (!changed.length) {
    throw new RevisionRejected("That is already how the design works, so nothing changed.");
  }
  const fixReplacedParts =
    JSON.stringify([result.spec.stack, result.spec.boxes]) !== JSON.stringify([fixed.stack, fixed.boxes]);
  return {
    kind: "revised",
    spec: fixed,
    lesson,
    summary: (fixReplacedParts ? "" : clip(raw.summary, 240)) || describeChange(spec, fixed),
    changed,
    rejected,
  };
}
