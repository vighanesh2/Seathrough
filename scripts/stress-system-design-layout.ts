import { existsSync, readFileSync } from "node:fs";
import { compileSystemDesign } from "../src/lib/experiment/systemDesign/compile";
import { layoutProblems, type GraphLayout } from "../src/lib/experiment/systemDesign/graphLayout";
import { SYSTEM_DESIGN_SECTION_IDS } from "../src/lib/experiment/systemDesign/sections";
import { parseSystemDesignSpec } from "../src/lib/experiment/systemDesign/spec";
import type { ExperimentShape } from "../src/lib/experiment/scene";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function asLayout(shapes: ExperimentShape[]): GraphLayout {
  return {
    boxes: new Map(
      shapes.flatMap((shape) =>
        shape.type === "geo" ? [[shape.id, { x: shape.x, y: shape.y, w: shape.w, h: shape.h }] as const] : [],
      ),
    ),
    routes: new Map(
      shapes.flatMap((shape) =>
        shape.type === "route"
          ? [[shape.id, { from: shape.from, to: shape.to, points: shape.points, ...(shape.label ? { label: shape.label } : {}) }] as const]
          : [],
      ),
    ),
  };
}

// The checker itself must catch what it claims to.
const crafted = layoutProblems({
  boxes: new Map([
    ["a", { x: 0, y: 0, w: 100, h: 50 }],
    ["b", { x: 60, y: 20, w: 100, h: 50 }],
    ["c", { x: 400, y: 0, w: 100, h: 50 }],
    ["mid", { x: 220, y: 0, w: 100, h: 50 }],
  ]),
  routes: new Map([
    ["ac", { from: "a", to: "c", points: [{ x: 100, y: 25 }, { x: 400, y: 25 }], label: { text: "x", x: 230, y: 10, w: 40, h: 30 } }],
    ["ca", { from: "c", to: "a", points: [{ x: 400, y: 30 }, { x: 100, y: 30 }], label: { text: "y", x: 240, y: 15, w: 40, h: 30 } }],
  ]),
});
assert(crafted.some((p) => p.includes("boxes a and b overlap")), "checker flags overlapping boxes");
assert(crafted.some((p) => p.includes("crosses box mid")), "checker flags an arrow through a box");
assert(crafted.some((p) => p.includes("sits on box mid")), "checker flags a label on a box");
assert(crafted.some((p) => p.includes("labels of ac and ca overlap")), "checker flags overlapping labels");
assert(crafted.some((p) => p.includes("runs through the label of")), "checker flags an arrow through a label");
const stacked = layoutProblems({
  boxes: new Map([
    ["a", { x: 0, y: 0, w: 100, h: 50 }],
    ["b", { x: 300, y: 0, w: 100, h: 50 }],
  ]),
  routes: new Map([
    ["ab", { from: "a", to: "b", points: [{ x: 100, y: 25 }, { x: 300, y: 25 }] }],
    ["ab2", { from: "a", to: "b", points: [{ x: 100, y: 26 }, { x: 300, y: 26 }] }],
  ]),
});
assert(stacked.some((p) => p.includes("on top of each other")), "checker flags arrows drawn on top of each other");

const sections = SYSTEM_DESIGN_SECTION_IDS.map((id) => ({ id, say: `${id} says`, example: `${id} example` }));

// Roughly the board from the bug report, at the spec limits: 12 boxes, 18 labeled arrows.
const dense = parseSystemDesignSpec({
  title: "Chat app",
  stack: { cloud: "AWS", database: "PostgreSQL on RDS", queue: "SQS", realtime: "AppSync (WebSocket)", auth: "Cognito", storage: "S3", observability: "CloudWatch", cache: "ElastiCache Redis" },
  sections,
  boxes: [
    { id: "client", label: "Mobile/Web Client", column: "client" },
    { id: "alb", label: "ALB", column: "edge" },
    { id: "appsync", label: "AppSync (WS)", column: "service" },
    { id: "write", label: "Lambda Write", column: "service" },
    { id: "worker", label: "Lambda Worker", column: "service" },
    { id: "receipt", label: "Lambda Read Receipt", column: "service" },
    { id: "auth", label: "Cognito", column: "service" },
    { id: "pg", label: "PostgreSQL on RDS", column: "data" },
    { id: "sqs", label: "SQS Queue", column: "data" },
    { id: "s3", label: "S3 Bucket", column: "data" },
    { id: "redis", label: "ElastiCache Redis", column: "data" },
    { id: "cw", label: "CloudWatch", column: "data" },
  ],
  arrows: [
    { from: "client", to: "alb", label: "HTTPS" },
    { from: "alb", to: "appsync", label: "WS" },
    { from: "alb", to: "auth", label: "sign in" },
    { from: "appsync", to: "write", label: "Invoke" },
    { from: "appsync", to: "receipt", label: "Invoke" },
    { from: "write", to: "pg", label: "Write" },
    { from: "write", to: "sqs", label: "Publish" },
    { from: "sqs", to: "worker", label: "Trigger" },
    { from: "worker", to: "pg", label: "Update" },
    { from: "worker", to: "s3", label: "Upload" },
    { from: "worker", to: "appsync", label: "Push" },
    { from: "receipt", to: "pg", label: "Write" },
    { from: "write", to: "redis", label: "cache" },
    { from: "pg", to: "write", label: "rows" },
    { from: "appsync", to: "client", label: "push" },
    { from: "write", to: "cw", label: "logs" },
    { from: "worker", to: "cw", label: "logs" },
    { from: "receipt", to: "redis", label: "presence" },
  ],
  tables: [
    { id: "users", name: "Users", fields: ["id", "email", "phone"], store: "pg" },
    { id: "messages", name: "Messages", fields: ["id", "sender_id", "recipient_id", "content", "media_id", "timestamp", "read_at"], store: "pg" },
    { id: "media", name: "Media", fields: ["id", "url", "type", "size", "uploaded_at"], store: "pg" },
    { id: "sessions", name: "Sessions", fields: ["id", "user_id", "expires_at"], store: "redis" },
  ],
  flow: [
    { from: "client", to: "alb", label: "send message" },
    { from: "alb", to: "appsync", label: "upgrade to WS" },
    { from: "appsync", to: "write", label: "invoke write" },
    { from: "write", to: "pg", label: "insert row" },
    { from: "write", to: "sqs", label: "publish event" },
    { from: "sqs", to: "worker", label: "trigger worker" },
    { from: "worker", to: "appsync", label: "push to recipient" },
    { from: "appsync", to: "client", label: "deliver" },
  ],
  points: {
    scaling: [
      { target: "write", label: "Lambda concurrency scales per request" },
      { target: "pg", label: "Read replicas for history" },
      { target: "appsync", label: "Managed WebSocket fan-out" },
    ],
    reliability: [
      { target: "sqs", label: "Worker crashes mid-message", then: "Message returns to the queue" },
      { target: "pg", label: "Primary fails", then: "Multi-AZ failover" },
      { target: "write", label: "Write times out", then: "Client retries with idempotency key" },
    ],
    security: [
      { target: "auth", label: "Cognito JWT on every call" },
      { target: "s3", label: "Pre-signed upload URLs" },
    ],
    observability: [
      { target: "write", label: "p95 write latency" },
      { target: "sqs", label: "Queue depth" },
      { target: "appsync", label: "Open connections" },
    ],
  },
  deployment: [
    { id: "public", label: "Public subnet", members: ["alb", "appsync"] },
    { id: "private", label: "Private subnet", members: ["write", "worker", "receipt", "auth"] },
    { id: "data", label: "Data subnet", members: ["pg", "sqs", "redis", "s3"] },
  ],
});

async function check(name: string, spec: ReturnType<typeof parseSystemDesignSpec>) {
  const started = Date.now();
  const lesson = await compileSystemDesign(spec, name);
  const ms = Date.now() - started;
  let total = 0;
  for (const beat of lesson.beats) {
    const problems = layoutProblems(asLayout(beat.shapes));
    total += problems.length;
    if (problems.length) console.log(`  ${name} / ${beat.sheet}: ${problems.join("; ")}`);
  }
  console.log(`${name}: ${total} problems, compiled in ${ms}ms`);
  return total;
}

let failures = await check("dense", dense);
for (const file of ["/tmp/sd-before.json", "/tmp/sd-after.json"]) {
  if (existsSync(file)) failures += await check(file, parseSystemDesignSpec(JSON.parse(readFileSync(file, "utf8"))));
}
// A lesson captured from the running app, exactly as the server sent it.
const live = "/tmp/sd-live-lesson.json";
if (existsSync(live)) {
  const lesson = JSON.parse(readFileSync(live, "utf8")) as { beats: { sheet?: string; shapes: ExperimentShape[] }[] };
  let total = 0;
  for (const beat of lesson.beats) {
    const problems = layoutProblems(asLayout(beat.shapes));
    total += problems.length;
    if (problems.length) console.log(`  ${live} / ${beat.sheet}: ${problems.join("; ")}`);
  }
  console.log(`${live}: ${total} problems in ${lesson.beats.length} beats`);
  failures += total;
}
assert(failures === 0, `${failures} layout problems`);
console.log("stress-system-design-layout ok");
