/**
 * System-design tutor checks (no network).
 * Run: npx --yes esbuild scripts/smoke-system-design.ts --bundle --platform=node --alias:@=./src --outfile=/tmp/smoke-sd.js && node /tmp/smoke-sd.js
 */
import { parseIntakeAnswers } from "../src/lib/experiment/systemDesign/answers";
import { compileSystemDesign } from "../src/lib/experiment/systemDesign/compile";
import { drawBranch, isSoftwareSystemDesign } from "../src/lib/experiment/systemDesign/detect";
import { changedSheets, freshNodeIds } from "../src/lib/experiment/systemDesign/diff";
import { layoutProblems } from "../src/lib/experiment/systemDesign/graphLayout";
import {
  applyDesignOps,
  describeChange,
  droppedNames,
  hasStaleParts,
  parseDesignOps,
  relabelFlow,
  renameGroups,
  staleParts,
  unwantedNames,
} from "../src/lib/experiment/systemDesign/ops";
import { SYSTEM_DESIGN_SECTION_IDS } from "../src/lib/experiment/systemDesign/sections";
import {
  applyDesignRepair,
  designGaps,
  needsCdnWaf,
  parseSystemDesignSpec,
  structureGaps,
} from "../src/lib/experiment/systemDesign/spec";
import {
  parseSavedDesignSession,
  sessionTitle,
} from "../src/lib/experiment/systemDesign/session";
import type { ExperimentShape } from "../src/lib/experiment/scene";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

// --- routing and intake ---
assert(isSoftwareSystemDesign("system design of a chat app"), "chat app should match");
assert(isSoftwareSystemDesign("design the backend for a news feed"), "backend should match");
assert(isSoftwareSystemDesign("how would you architect a url shortener"), "architect should match");
assert(!isSoftwareSystemDesign("what is a derivative"), "derivative stays a lesson");
assert(!isSoftwareSystemDesign("draw a diagram of the heart"), "heart stays a lesson");
assert(!isSoftwareSystemDesign("design a function to sort a list"), "function stays a lesson");
assert(drawBranch("system design of a chat app", false) === "intake", "ask first");
assert(drawBranch("system design of a chat app", true) === "design", "answers continue");
assert(!parseIntakeAnswers({ who: "", scale: "x", dayOne: "x", constraint: "x" }).ok, "empty who is rejected");
const intake = parseIntakeAnswers({
  who: "Friends sending messages",
  scale: "A few thousand online",
  dayOne: "Realtime text, no payments",
  constraint: "Messages stay in order",
});
assert(intake.ok, "full answers pass");
assert(!needsCdnWaf("a few thousand online") && needsCdnWaf("millions worldwide"), "CDN only for large audiences");

// --- a chat design on Supabase ---
const sections = SYSTEM_DESIGN_SECTION_IDS.map((id) => ({
  id,
  say:
    id === "deployment"
      ? "Everything runs on Supabase with Edge Functions in one region."
      : id === "requirements"
        ? "Friends chat in realtime. Supabase keeps it small to run."
        : `${id} decision for this chat product.`,
  example: `${id} artifact`,
}));
const raw = {
  title: "Chat app",
  stack: {
    cloud: "Supabase",
    database: "Supabase Postgres",
    realtime: "Supabase Realtime",
    auth: "Supabase Auth",
    observability: "Grafana",
    compute: "N/A",
  },
  sections,
  boxes: [
    { id: "web", label: "Web Client", column: "client" },
    { id: "lb", label: "Load Balancer", column: "edge" },
    { id: "api", label: "Edge Functions", column: "service" },
    { id: "auth", label: "Supabase Auth", column: "service" },
    { id: "rt", label: "Supabase Realtime", column: "service" },
    { id: "db", label: "Supabase Postgres", column: "data" },
    { id: "na", label: "N/A", column: "data" },
  ],
  arrows: [
    { from: "web", to: "lb", label: "HTTPS" },
    { from: "lb", to: "api", label: "HTTP" },
    { from: "api", to: "db", label: "SQL" },
    { from: "db", to: "api", label: "rows" },
    { from: "rt", to: "web", label: "push" },
    { from: "api", to: "ghost", label: "dangling" },
  ],
  tables: [
    { id: "users", name: "Users", fields: ["id", "email"] },
    { id: "messages", name: "Messages", fields: ["id", "sender_id", "body"], store: "db" },
  ],
  flow: [
    { from: "web", to: "api", label: "send" },
    { from: "api", to: "db", label: "insert" },
    { from: "db", to: "rt", label: "change event" },
    { from: "rt", to: "web", label: "deliver" },
  ],
  points: {
    scaling: [{ target: "api", label: "Autoscale functions" }],
    reliability: [{ target: "db", label: "Primary goes down", then: "Point-in-time restore" }],
    security: [{ target: "auth", label: "Row level security" }],
    observability: [{ target: "api", label: "p95 send latency" }],
  },
  deployment: [{ id: "region", label: "us-east-1", members: ["api", "db", "rt", "ghost"] }],
};

const spec = parseSystemDesignSpec(raw);
assert(!spec.boxes.some((box) => box.label === "N/A"), "placeholder boxes stay off the board");
assert(!("compute" in spec.stack), "placeholder stack values are dropped");
assert(!spec.arrows.some((arrow) => arrow.to === "ghost"), "arrows to unknown boxes are dropped");
assert(!spec.deployment[0]!.members.includes("ghost"), "deployment members must be boxes");
assert(JSON.stringify(parseSystemDesignSpec(spec)) === JSON.stringify(spec), "parse is idempotent");
assert(designGaps(spec).length === 0 && structureGaps(spec).length === 0, "complete design has no gaps");

const lesson = await compileSystemDesign(spec, "system design of a chat app");
const beat = (sheet: string) => lesson.beats.find((item) => item.sheet === sheet)!;
const ids = (sheet: string) => beat(sheet).shapes.map((shape) => shape.id);
const hop = (shapes: ExperimentShape[], from: string, to: string, label?: string) =>
  shapes.some(
    (shape) =>
      shape.type === "route" &&
      shape.from === from &&
      shape.to === to &&
      (label === undefined || shape.label?.text === label),
  );

/** What the board would show as overlapping, measured on the final placed shapes. */
function sheetProblems(shapes: ExperimentShape[]): string[] {
  const boxes = new Map(
    shapes.flatMap((shape) =>
      shape.type === "geo" ? [[shape.id, { x: shape.x, y: shape.y, w: shape.w, h: shape.h }] as const] : [],
    ),
  );
  const routes = new Map(
    shapes.flatMap((shape) =>
      shape.type === "route"
        ? [[shape.id, { from: shape.from, to: shape.to, points: shape.points, ...(shape.label ? { label: shape.label } : {}) }] as const]
        : [],
    ),
  );
  return layoutProblems({ boxes, routes });
}
const labelOf = (shapes: ExperimentShape[], id: string) => {
  const shape = shapes.find((item) => item.id === id);
  return shape?.type === "geo" ? shape.label : undefined;
};

assert(lesson.beats.length === 9, "nine sheets");
assert(
  lesson.beats.map((item) => item.sheet).join("|") === SYSTEM_DESIGN_SECTION_IDS.join("|"),
  "every beat carries its section id in order",
);
assert(labelOf(beat("requirements").shapes, "req-database")?.includes("Supabase Postgres"), "stack shows on the requirements sheet");
assert(hop(beat("architecture").shapes, "web", "lb", "HTTPS"), "architecture is drawn from the spec arrows");
assert(hop(beat("architecture").shapes, "api", "db", "SQL"), "API talks SQL to the database");
const routeOf = (from: string, to: string) =>
  beat("architecture").shapes.find((shape) => shape.type === "route" && shape.from === from && shape.to === to);
const forward = routeOf("api", "db");
const reverse = routeOf("db", "api");
assert(
  forward?.type === "route" && reverse?.type === "route" && JSON.stringify(forward.points) !== JSON.stringify(reverse.points),
  "a reply arrow takes its own path",
);
for (const item of lesson.beats) {
  const problems = sheetProblems(item.shapes);
  assert(!problems.length, `${item.sheet} has no overlaps: ${problems.join("; ")}`);
}
const archBoxes = beat("architecture").shapes.filter((shape) => shape.type === "geo");
const xOf = (id: string) => archBoxes.find((shape) => shape.id === id)!.x;
assert(xOf("web") < xOf("lb") && xOf("lb") < xOf("api") && xOf("api") < xOf("db"), "architecture keeps client, edge, service, data order");
assert(ids("data-model").includes("tbl-users") && hop(beat("data-model").shapes, "dm-db", "tbl-messages", "has"), "tables hang off their store");
assert(labelOf(beat("data-model").shapes, "tbl-messages")?.includes("sender_id"), "tables list their fields");
assert(labelOf(beat("flows").shapes, "flow-step-0") === "1. send", "flow steps are numbered");
assert(hop(beat("flows").shapes, "flow-head-web", "flow-step-0"), "flow starts at the sender");
assert(hop(beat("flows").shapes, "flow-step-2", "flow-step-3"), "flow continues where the last step landed");
assert(hop(beat("reliability").shapes, "rel-p-0", "rel-n-0", "then"), "a failure leads to its recovery");
assert(hop(beat("observability").shapes, "obs-p-0", "obs-sink", "collect"), "signals land in the observability tool");
assert(labelOf(beat("observability").shapes, "obs-sink") === "Grafana", "the sink is the stack choice");
assert(hop(beat("deployment").shapes, "dep-root", "dep-region", "contains"), "the cloud contains the region");
assert(labelOf(beat("deployment").shapes, "dep-root") === "Supabase", "deployment root is the cloud choice");
assert(!lesson.beats.some((item) => item.shapes.some((shape) => shape.type === "note")), "no sticky notes");
assert(!lesson.beats.some((item) => item.check), "a system design plays straight through");
assert(beat("architecture").shapes.some((shape) => shape.type === "text" && shape.text === "High-level architecture"), "each sheet is labeled");

const bottomOf = (sheet: string) =>
  Math.max(
    ...beat(sheet).shapes.map((shape) =>
      shape.type === "geo"
        ? shape.y + shape.h
        : shape.type === "route"
          ? Math.max(...shape.points.map((point) => point.y), shape.label ? shape.label.y + shape.label.h : 0)
          : "y" in shape
            ? shape.y
            : 0,
    ),
  );
const topOf = (sheet: string) =>
  Math.min(...beat(sheet).shapes.flatMap((shape) => (shape.type === "geo" || shape.type === "text" ? [shape.y] : [])));
for (let index = 1; index < SYSTEM_DESIGN_SECTION_IDS.length; index += 1) {
  const above = SYSTEM_DESIGN_SECTION_IDS[index - 1]!;
  const below = SYSTEM_DESIGN_SECTION_IDS[index]!;
  assert(topOf(below) > bottomOf(above), `${below} sits below ${above}`);
}

// --- gaps and repair ---
const partial = parseSystemDesignSpec({
  ...raw,
  sections: sections.filter((section) => section.id !== "security"),
  points: { ...raw.points, security: [] },
});
assert(designGaps(partial).includes("security") && structureGaps(partial).includes("security"), "dropped section is a gap");
let threw = false;
try {
  await compileSystemDesign(partial, "chat");
} catch {
  threw = true;
}
assert(threw, "an incomplete design is not compiled");
const repaired = applyDesignRepair(partial, {
  sections: [{ id: "security", say: "Sessions are signed.", example: "HTTPS only" }, { id: "architecture", say: "overwrite attempt" }],
  points: { security: [{ target: "auth", label: "JWT" }] },
});
assert(designGaps(repaired).length === 0, "repair fills the gap");
assert(repaired.points.security[0]?.label === "JWT", "repair fills empty points");
assert(repaired.sections.find((section) => section.id === "architecture")?.say === "architecture decision for this chat product.", "repair never overwrites");

// --- edit: Supabase to AWS ---
const swap = parseDesignOps([
  { op: "setStack", key: "cloud", value: "AWS" },
  { op: "setStack", key: "database", value: "PostgreSQL on RDS" },
  { op: "setStack", key: "realtime", value: "API Gateway WebSockets" },
  { op: "setStack", key: "auth", value: "Cognito" },
  { op: "upsertBox", id: "db", label: "RDS PostgreSQL" },
  { op: "upsertBox", id: "auth", label: "Cognito" },
  { op: "upsertBox", id: "rt", label: "WebSocket Gateway" },
  { op: "upsertBox", id: "api", label: "Lambda API" },
  { op: "setDeployment", groups: [{ id: "vpc", label: "AWS VPC", members: ["api", "db", "rt"] }] },
  { op: "bogus" },
  { op: "setStack", key: "nope", value: "x" },
]);
assert(swap.ops.length === 9 && swap.rejected.length === 2, "unknown ops and keys are rejected, the rest kept");
const aws = applyDesignOps(spec, swap.ops);
assert(aws.applied === 9 && aws.rejected.length === 0, "provider swap applies cleanly");
assert(aws.spec.boxes.find((box) => box.id === "db")?.label === "RDS PostgreSQL", "relabel keeps the id");
assert(aws.spec.arrows.some((arrow) => arrow.from === "api" && arrow.to === "db"), "connections survive a relabel");
assert(spec.boxes.find((box) => box.id === "db")?.label === "Supabase Postgres", "the original spec is untouched");

const awsLesson = await compileSystemDesign(aws.spec, "system design of a chat app");
const diff = changedSheets(lesson, awsLesson);
for (const sheet of ["requirements", "architecture", "data-model", "flows", "reliability", "security", "observability", "deployment"]) {
  assert(diff.shapes.includes(sheet), `${sheet} redraws after the swap`);
}
assert(!diff.shapes.includes("scaling") || labelOf(beat("scaling").shapes, "sc-t-api") !== undefined, "scaling only redraws if a box in it changed");
const freshArch = freshNodeIds(beat("architecture"), awsLesson.beats.find((item) => item.sheet === "architecture")!);
assert(freshArch.includes("db") && freshArch.includes("auth") && !freshArch.includes("web"), "only relabeled boxes are outlined");

const stale = staleParts(spec, aws.spec).sections;
assert(stale.some((item) => item.id === "deployment" && item.words.includes("supabase")), "deployment text still naming Supabase is stale");
assert(stale.some((item) => item.id === "requirements"), "requirements text still naming Supabase is stale");
assert(!stale.some((item) => item.id === "architecture"), "sections that never named Supabase are not stale");
assert(!droppedNames(spec, aws.spec).some((word) => word === "realtime" || word === "auth"), "concept words are never stale");

// The model swapped the boxes but forgot the deployment group: still caught.
const forgot = applyDesignOps(spec, swap.ops.filter((op) => op.op !== "setDeployment")).spec;
const leftovers = applyDesignOps(forgot, parseDesignOps([]).ops).spec;
const withGroup = { ...leftovers, deployment: [{ id: "region", label: "Supabase region", members: ["api"] }] };
const parts = staleParts(spec, withGroup);
assert(hasStaleParts(parts) && parts.groups.some((group) => group.id === "region"), "a group still named for Supabase is stale");
assert(renameGroups(withGroup, [{ id: "region", label: "AWS us-east-1" }]).deployment[0]!.label === "AWS us-east-1", "stale groups can be renamed");
assert(!hasStaleParts(staleParts(spec, spec)), "an unchanged design has nothing stale");

const leftoverLabels = parseSystemDesignSpec({
  ...aws.spec,
  points: { ...aws.spec.points, scaling: [{ target: "api", label: "Vertical scaling via Supabase" }] },
  flow: [
    { from: "web", to: "api", label: "POST /messages" },
    { from: "api", to: "web", label: "Supabase push" },
  ],
});
const labelParts = staleParts(spec, leftoverLabels);
assert(labelParts.points.some((item) => item.section === "scaling"), "a point still naming Supabase is stale");
assert(labelParts.flow.length === 1 && labelParts.flow[0]!.index === 1, "a flow step still naming Supabase is stale");
const relabeled = relabelFlow(leftoverLabels, [{ index: 1, label: "AppSync push" }, { index: 9, label: "ghost" }]);
assert(relabeled.flow[1]!.label === "AppSync push" && relabeled.flow.length === 2, "stale flow steps can be relabeled, unknown steps ignored");
assert(relabelFlow(leftoverLabels, [{ index: 1, label: "N/A" }]).flow[1]!.label === "Supabase push", "placeholder relabels are ignored");

// The model swapped only the database when the student asked for AWS instead of Supabase.
const dbOnly = applyDesignOps(
  spec,
  parseDesignOps([
    { op: "setStack", key: "cloud", value: "AWS" },
    { op: "setStack", key: "database", value: "RDS Postgres" },
    { op: "upsertBox", id: "db", label: "RDS Postgres" },
  ]).ops,
).spec;
const whole = unwantedNames("I want to use AWS instead of Supabase", spec);
assert(whole.length === 1 && whole[0]!.product.join() === "supabase" && !whole[0]!.qualifier.length, "reads the product to drop");
const partialParts = staleParts(spec, dbOnly, whole);
assert(
  partialParts.stack.map((item) => item.key).sort().join() === "auth,realtime",
  "stack choices still on Supabase are stale",
);
assert(partialParts.boxes.map((box) => box.id).sort().join() === "auth,rt", "boxes still on Supabase are stale");
assert(partialParts.sections.some((item) => item.id === "requirements"), "prose naming Supabase is stale while Supabase remains");

const authOnly = unwantedNames("replace supabase auth with cognito", spec);
assert(authOnly.length === 1 && authOnly[0]!.qualifier.join() === "auth", "a qualified drop keeps its qualifier");
const authParts = staleParts(spec, spec, authOnly);
assert(authParts.stack.map((item) => item.key).join() === "auth", "only the auth stack choice is stale");
assert(authParts.boxes.map((box) => box.id).join() === "auth", "only the auth box is stale");
assert(!authParts.sections.some((item) => item.id === "requirements"), "prose naming Supabase alone is fine when only auth moves");

assert(!unwantedNames("drop the cache", spec).length, "concept words are not products");
assert(!unwantedNames("instead of Firebase use Supabase", spec).length, "products the design never used are ignored");
assert(unwantedNames("remove Grafana.", spec)[0]?.product.join() === "grafana", "remove reads the product");
assert(!unwantedNames("", spec).length, "empty message has nothing to drop");
assert(!hasStaleParts(staleParts(spec, spec, [])), "no drops and no edit means nothing stale");

const badFlow = applyDesignOps(
  spec,
  parseDesignOps([{ op: "setFlow", steps: [{ from: "web", to: "api", label: "send" }, { from: "client", to: "api", label: "x" }] }]).ops,
);
assert(badFlow.rejected.length === 1 && badFlow.spec.flow.length === spec.flow.length, "a flow using unknown boxes keeps the old flow");
const goodFlow = applyDesignOps(
  spec,
  parseDesignOps([{ op: "setFlow", steps: [{ from: "web", to: "api", label: "send" }, { from: "api", to: "db", label: "insert" }] }]).ops,
);
assert(!goodFlow.rejected.length && goodFlow.spec.flow.length === 2, "a valid flow replaces the old one");
const flowAfterBox = applyDesignOps(
  spec,
  parseDesignOps([
    { op: "upsertBox", id: "s3", label: "S3", column: "data" },
    { op: "setFlow", steps: [{ from: "web", to: "api", label: "upload" }, { from: "api", to: "s3", label: "put" }] },
  ]).ops,
);
assert(!flowAfterBox.rejected.length && flowAfterBox.spec.flow[1]!.to === "s3", "a flow may use a box added earlier in the same edit");

const naExample = parseSystemDesignSpec({
  ...raw,
  sections: raw.sections.map((section) => (section.id === "requirements" ? { ...section, example: "N/A" } : section)),
});
assert(naExample.sections.find((section) => section.id === "requirements")!.example === "", "placeholder examples are dropped");

const said = describeChange(spec, aws.spec);
assert(/database is now PostgreSQL on RDS/.test(said) && said.endsWith("."), "fallback summary names the change");
assert(describeChange(spec, spec) === "Updated the design.", "no change, plain summary");

// --- edit: add a feature ---
const feature = applyDesignOps(
  aws.spec,
  parseDesignOps([
    { op: "upsertBox", id: "media", label: "S3 Media", column: "data" },
    { op: "addArrow", from: "api", to: "media", label: "presigned PUT" },
    { op: "upsertTable", id: "attachments", name: "Attachments", fields: ["id", "message_id", "s3_key"], store: "db" },
    { op: "addArrow", from: "api", to: "nowhere" },
  ]).ops,
);
assert(feature.applied === 3 && feature.rejected.length === 1, "an arrow to a missing box is rejected alone");
const featureLesson = await compileSystemDesign(feature.spec, "chat");
for (const item of featureLesson.beats) {
  const problems = sheetProblems(item.shapes);
  assert(!problems.length, `after adding a feature, ${item.sheet} has no overlaps: ${problems.join("; ")}`);
}
assert(featureLesson.beats.find((item) => item.sheet === "architecture")!.shapes.some((shape) => shape.id === "media"), "new box is drawn");
assert(featureLesson.beats.find((item) => item.sheet === "data-model")!.shapes.some((shape) => shape.id === "tbl-attachments"), "new table is drawn");

// --- edit: remove and replace ---
const removed = applyDesignOps(spec, parseDesignOps([{ op: "removeBox", id: "rt" }]).ops);
assert(!removed.spec.arrows.some((arrow) => arrow.from === "rt" || arrow.to === "rt"), "removing a box drops its arrows");
assert(!removed.spec.flow.some((step) => step.from === "rt" || step.to === "rt"), "and its flow steps");
assert(!removed.spec.deployment[0]!.members.includes("rt"), "and its deployment slot");
const merged = applyDesignOps(spec, parseDesignOps([{ op: "removeBox", id: "rt", replaceWith: "api" }]).ops);
assert(merged.spec.flow.some((step) => step.from === "db" && step.to === "api"), "replaceWith moves connections onto the new box");
assert(!merged.spec.flow.some((step) => step.from === step.to), "and never leaves a self-loop");

// --- edit edge cases ---
assert(parseDesignOps("nonsense").ops.length === 0, "a non-list is no edits");
assert(parseDesignOps([]).ops.length === 0, "an empty list is no edits");
assert(applyDesignOps(spec, []).applied === 0, "no edits applies nothing");
assert(applyDesignOps(spec, parseDesignOps([{ op: "removeBox", id: "missing" }]).ops).rejected.length === 1, "removing a missing box is rejected");
assert(applyDesignOps(spec, parseDesignOps([{ op: "upsertBox", id: "new-thing" }]).ops).rejected.length === 1, "a new box needs a label");
assert(parseDesignOps([{ op: "upsertBox", id: "x", label: "N/A" }]).rejected.length === 1, "placeholder labels are rejected");
assert(parseDesignOps([{ op: "setSection", id: "security" }]).rejected.length === 1, "an empty section rewrite is rejected");
const tiny = parseSystemDesignSpec({ ...raw, boxes: raw.boxes.slice(0, 2) });
assert(applyDesignOps(tiny, parseDesignOps([{ op: "removeBox", id: "web" }]).ops).rejected.length === 1, "a design keeps two boxes");
const crowded = applyDesignOps(
  spec,
  parseDesignOps(Array.from({ length: 12 }, (_, index) => ({ op: "upsertBox", id: `extra-${index}`, label: `Extra ${index}` }))).ops,
);
assert(crowded.spec.boxes.length === 12 && crowded.rejected.length > 0, "box cap holds");
const long = parseDesignOps([{ op: "upsertBox", id: "db", label: "A".repeat(200) }]);
assert((long.ops[0] as { label?: string }).label!.length <= 24, "labels are clipped");
const undone = changedSheets(awsLesson, lesson);
assert(undone.shapes.includes("architecture"), "undo diff redraws the architecture back");
assert(changedSheets(lesson, lesson).shapes.length === 0, "no change, no redraw");

// --- saved session ---
assert(!parseSavedDesignSession(null).ok, "empty session is rejected");
assert(!parseSavedDesignSession({ prompt: "chat", spec }).ok, "session needs intake answers");
const saved = parseSavedDesignSession({
  version: 1,
  prompt: "system design of a chat app",
  answers: intake.ok ? intake.answers : {},
  spec,
  edits: ["use AWS"],
  messages: [
    { id: "m1", role: "user", text: "system design of a chat app", afterBeat: -1 },
    { id: "m2", role: "tutor", text: "Switched the stack to AWS.", afterBeat: 2 },
    { role: "other", text: "drop me" },
    { role: "user", text: "   " },
  ],
});
assert(saved.ok, "a complete session saves");
if (saved.ok) {
  assert(saved.session.messages.length === 2, "only real conversation lines are kept");
  assert(saved.session.messages[0]?.role === "user", "the student's prompt is kept");
  assert(saved.session.edits[0] === "use AWS", "edit history is kept");
  assert(sessionTitle(saved.session) === "Chat app", "title prefers the design name");
}

console.log("smoke-system-design ok");
