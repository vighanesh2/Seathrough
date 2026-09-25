/**
 * System-design tutor checks (no network).
 * Run: npx --yes esbuild scripts/smoke-system-design.ts --bundle --platform=node --outfile=/tmp/smoke-sd.js && node /tmp/smoke-sd.js
 */
import { parseIntakeAnswers } from "../src/lib/experiment/systemDesign/answers";
import {
  applyDesignRepair,
  compileSystemDesign,
  designGaps,
  parseSystemDesignSpec,
} from "../src/lib/experiment/systemDesign/compile";
import { drawBranch, isSoftwareSystemDesign } from "../src/lib/experiment/systemDesign/detect";
import { SYSTEM_DESIGN_SECTION_IDS } from "../src/lib/experiment/systemDesign/sections";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  isSoftwareSystemDesign("system design of a chat app"),
  "chat app should match",
);
assert(
  isSoftwareSystemDesign("design the backend for a news feed"),
  "backend should match",
);
assert(
  isSoftwareSystemDesign("how would you architect a url shortener"),
  "architect should match",
);
assert(!isSoftwareSystemDesign("what is a derivative"), "derivative stays a lesson");
assert(
  !isSoftwareSystemDesign("draw a diagram of the heart"),
  "heart stays a lesson",
);
assert(!isSoftwareSystemDesign("design a function to sort a list"), "function stays a lesson");
assert(drawBranch("what is a derivative", false) === "lesson", "normal lesson branch");
assert(drawBranch("system design of a chat app", false) === "intake", "ask first");
assert(drawBranch("system design of a chat app", true) === "design", "answers continue");

const empty = parseIntakeAnswers({ who: "", scale: "thousands", dayOne: "chat", constraint: "none" });
assert(!empty.ok, "empty who is rejected");

const filled = parseIntakeAnswers({
  who: "Friends sending messages",
  scale: "A few thousand online",
  dayOne: "Realtime text, no payments",
  constraint: "Messages stay in order",
});
assert(filled.ok, "full answers pass");

const placeholders = parseSystemDesignSpec({
  boxes: [
    { id: "web", label: "Web Client", column: "client" },
    { id: "na", label: "N/A", column: "service" },
    { id: "na2", label: "Not applicable", column: "data" },
    { id: "api", label: "API", column: "service" },
  ],
});
assert(
  !placeholders.boxes.some((box) => /n\/a|not applicable/i.test(box.label)),
  "placeholder boxes stay off the board",
);
assert(placeholders.boxes.some((box) => box.label === "API"), "real boxes remain");

const partial = parseSystemDesignSpec({
  title: "Chat",
  sections: SYSTEM_DESIGN_SECTION_IDS.filter(
    (id) => id !== "security" && id !== "observability",
  ).map((id) => ({
    id,
    say: `${id} decision for this chat product.`,
    example: id === "architecture" || id === "data-model" || id === "flows" ? `${id} artifact` : "",
  })),
  boxes: [
    { id: "client", label: "Client", column: "client" },
    { id: "api", label: "API", column: "service" },
    { id: "db", label: "Database", column: "data" },
  ],
  arrows: [{ from: "client", to: "api", label: "send" }],
});
const gaps = designGaps(partial);
assert(gaps.includes("security") && gaps.includes("observability"), "dropped sections are gaps");

const repaired = applyDesignRepair(partial, {
  sections: [
    { id: "security", say: "Sessions are signed and short lived.", example: "HTTPS only" },
    { id: "observability", say: "Watch error rate and send latency.", example: "p95 send latency" },
  ],
});
assert(designGaps(repaired).length === 0, "repair fills the dropped sections");

const lesson = compileSystemDesign(repaired, "system design of a chat app");
assert(lesson.beats.length === 9, "nine beats");
assert(
  lesson.beats.map((beat) => beat.section).join("|") ===
    "Requirements|High-level architecture|Data model|Key request/response flows|Scaling|Reliability|Security|Observability|Deployment",
  "section order",
);
const ids = lesson.beats.flatMap((beat) => beat.shapes.map((shape) => shape.id));
assert(ids.includes("client") && ids.includes("api") && ids.includes("db"), "boxes are drawn");
const archBeat = lesson.beats.find((beat) => beat.section === "High-level architecture");
assert(Boolean(archBeat?.shapes.some((shape) => shape.id === "client")), "client arrives with the architecture");
const arrows = lesson.beats.flatMap((beat) =>
  beat.shapes.filter((shape) => shape.type === "arrow"),
);
assert(
  arrows.some(
    (shape) =>
      shape.type === "arrow" &&
      shape.from === "client" &&
      shape.to === "internet" &&
      shape.label === "HTTPS",
  ),
  "client enters through the internet",
);
assert(
  arrows.some(
    (shape) =>
      shape.type === "arrow" &&
      shape.from === "internet" &&
      shape.to === "load-balancer" &&
      shape.label === "HTTPS",
  ),
  "internet reaches the load balancer",
);
assert(
  !arrows.some((shape) => shape.type === "arrow" && shape.to === "cdn-waf"),
  "a few thousand users do not get a CDN",
);
assert(
  arrows.some(
    (shape) =>
      shape.type === "arrow" &&
      shape.from === "load-balancer" &&
      shape.to === "api" &&
      shape.label === "HTTPS",
  ),
  "the load balancer reaches the API",
);
assert(
  arrows.some(
    (shape) =>
      shape.type === "arrow" &&
      shape.from === "obs-app" &&
      shape.to === "obs-metrics" &&
      shape.label === "emit",
  ),
  "the application emits metrics",
);
assert(
  arrows.some(
    (shape) =>
      shape.type === "arrow" &&
      shape.from === "api" &&
      shape.to === "obs-app" &&
      shape.label === "telemetry",
  ),
  "the API feeds the application signal",
);
assert(
  arrows.some(
    (shape) =>
      shape.type === "arrow" &&
      shape.from === "obs-platform" &&
      shape.to === "obs-alerts" &&
      shape.label === "page",
  ),
  "the observability platform pages on alerts",
);
assert(
  arrows.some(
    (shape) =>
      shape.type === "arrow" &&
      shape.from === "api" &&
      shape.to === "db" &&
      shape.label === "SQL",
  ),
  "API writes to the database over SQL",
);

{
  const chat = parseSystemDesignSpec({
    title: "Chat",
    sections: SYSTEM_DESIGN_SECTION_IDS.map((id) => ({
      id,
      say: `${id} decision.`,
      example: "artifact",
    })),
    boxes: [
      { id: "web", label: "Web Client", column: "client" },
      { id: "api", label: "API Service", column: "service" },
      { id: "auth", label: "Auth Service", column: "service" },
      { id: "msg", label: "Message Service", column: "service" },
      { id: "ws", label: "WebSocket Service", column: "service" },
      { id: "pg", label: "PostgreSQL", column: "data" },
      { id: "redis", label: "Redis Pub/Sub", column: "data" },
    ],
  });
  const wired = compileSystemDesign(chat, "system design of a chat app");
  const hops = wired.beats.flatMap((beat) =>
    beat.shapes.filter((shape) => shape.type === "arrow"),
  );
  const hop = (from: string, to: string, label: string) =>
    hops.some(
      (shape) =>
        shape.type === "arrow" &&
        shape.from === from &&
        shape.to === to &&
        shape.label === label,
    );
  assert(hop("internet", "load-balancer", "HTTPS"), "internet reaches the load balancer");
  assert(hop("load-balancer", "hl-api", "HTTPS"), "the load balancer reaches the API");
  assert(hop("load-balancer", "hl-ws", "WebSocket"), "the load balancer reaches the socket service");
  assert(hop("hl-api", "hl-msg", "calls"), "the API calls the message service");
  assert(hop("hl-msg", "hl-pg", "write"), "the message service writes to Postgres");
  assert(hop("hl-ws", "hl-pubsub", "publish"), "sockets publish to Redis");
  assert(hop("mf-user-a", "mf-ws-1", "WebSocket"), "user A sends over a socket");
  assert(hop("mf-ws-1", "mf-msg", "authenticate"), "the socket server authenticates the message");
  assert(hop("mf-msg", "mf-pubsub", "publish"), "the message is published");
  assert(hop("mf-ws-2", "mf-user-b", "WebSocket"), "user B receives the message");
  assert(hop("seq-user", "seq-client", "Send"), "the sequence starts with send");
  assert(hop("seq-redis", "seq-ws", "event"), "Redis notifies the socket server");
  assert(hop("rel-offline", "rel-none", "drop"), "an offline user gets no delivery");
  assert(hop("rel-reconnect", "rel-fetch", "since last id"), "reconnect fetches missed messages");
  assert(hop("prod-aws", "prod-waf", "edge"), "AWS starts at the WAF");
  assert(hop("prod-alb", "prod-api", "HTTPS"), "the ALB routes to API tasks");
  assert(hop("prod-pg", "prod-backups", "snapshot"), "RDS is backed up");
  assert(hop("prod-backups", "prod-dr", "restore"), "backups feed disaster recovery");
  assert(hop("obs-logs", "obs-platform", "collect"), "logs land in Grafana");
  assert(hop("sec-client", "sec-auth", "POST /login"), "login is a request to auth");
  assert(hop("sec-client", "sec-api", "Bearer JWT"), "later calls carry the token");
  assert(hop("dm-pg", "table-users", "has"), "users are a table in Postgres");
  assert(hop("dm-pg", "table-messages", "has"), "messages are a table in Postgres");
  assert(hop("redis", "redis-pubsub", "shared"), "small scale shares one Redis");
  const architectureBeat = wired.beats.find((beat) => beat.section === "High-level architecture");
  const dataBeat = wired.beats.find((beat) => beat.section === "Data model");
  const deployBeat = wired.beats.find((beat) => beat.section === "Deployment");
  const observeBeat = wired.beats.find((beat) => beat.section === "Observability");
  const sequenceBeat = wired.beats.find((beat) => beat.section === "Sequence");
  assert(architectureBeat?.diagram === "architecture", "architecture is its own diagram");
  assert(dataBeat?.diagram === "data", "the schema is its own diagram");
  assert(deployBeat?.diagram === "deploy", "deployment is its own diagram");
  assert(observeBeat?.diagram === "observe", "observability is its own diagram");
  assert(sequenceBeat?.diagram === "sequence", "the sequence is its own diagram");
  assert(
    !architectureBeat?.shapes.some(
      (shape) =>
        shape.type === "geo" &&
        (shape.id.startsWith("obs-") ||
          shape.id.startsWith("prod-") ||
          shape.id.startsWith("table-")),
    ),
    "the architecture diagram leaves out the other sheets",
  );
  const messages = wired.beats
    .flatMap((beat) => beat.shapes)
    .find((shape) => shape.id === "table-messages");
  const fields = messages?.type === "geo" ? (messages.label ?? "") : "";
  assert(
    fields.includes("conversation_id") &&
      fields.includes("sender_id") &&
      fields.includes("status") &&
      fields.includes("client_message_id"),
    "the messages table shows its main fields",
  );
  assert(
    !hops.some(
      (shape) =>
        shape.type === "arrow" && shape.from === "msg" && shape.to === "redis",
    ),
    "Redis is the socket fanout, not a side store",
  );
  const big = compileSystemDesign(chat, "system design of a chat app", "millions of users worldwide");
  const bigHops = big.beats.flatMap((beat) => beat.shapes);
  assert(
    bigHops.some((shape) => shape.id === "cdn-waf"),
    "a global audience gets a CDN and WAF",
  );
  assert(
    bigHops.some(
      (shape) =>
        shape.type === "arrow" &&
        shape.from === "internet" &&
        shape.to === "cdn-waf",
    ),
    "internet reaches the CDN before the load balancer",
  );
  assert(
    bigHops.some(
      (shape) =>
        shape.type === "arrow" &&
        shape.from === "cdn-waf" &&
        shape.to === "load-balancer",
    ),
    "CDN forwards to the load balancer",
  );
  assert(
    bigHops.some(
      (shape) =>
        shape.type === "arrow" &&
        shape.from === "redis" &&
        shape.to === "redis-pubsub" &&
        shape.label === "own cluster",
    ),
    "a large audience splits Redis into clusters",
  );
  const scaling = wired.beats.find((beat) => beat.section === "Scaling");
  assert(
    Boolean(scaling?.say.includes("Pub/Sub does not keep a message")) &&
      Boolean(scaling?.say.includes("Kafka")),
    "the design says pub/sub is not a durable queue",
  );
}
assert(
  !lesson.beats.some((beat) => beat.shapes.some((shape) => shape.type === "note")),
  "section text stays in the script, not as sticky notes",
);
assert(
  !lesson.beats.some((beat) => beat.check),
  "a system design plays straight through",
);
assert(
  lesson.beats.some(
    (beat) =>
      beat.section === "High-level architecture" &&
      beat.shapes.some((shape) => shape.type === "text" && shape.text === "High-level architecture"),
  ),
  "each diagram is labeled",
);
const architectureTop = lesson.beats.find((beat) => beat.diagram === "architecture");
const dataTop = lesson.beats.find((beat) => beat.diagram === "data");
const archBottom = Math.max(
  ...((architectureTop?.shapes ?? [])
    .filter((shape) => shape.type === "geo")
    .map((shape) => (shape.type === "geo" ? shape.y + shape.h : 0))),
);
const dataTopY = Math.min(
  ...((dataTop?.shapes ?? [])
    .filter((shape) => shape.type === "geo" || shape.type === "text")
    .map((shape) => ("y" in shape ? shape.y : 0))),
);
assert(dataTopY > archBottom, "the data diagram sits below the architecture");

console.log("smoke-system-design ok");
