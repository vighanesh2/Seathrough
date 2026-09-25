import type {
  ExperimentBeat,
  ExperimentColor,
  ExperimentLesson,
  ExperimentShape,
} from "@/lib/experiment/scene";
import {
  SYSTEM_DESIGN_SECTION_IDS,
  sectionLabel,
  type SystemDesignSectionId,
} from "@/lib/experiment/systemDesign/sections";

const ARTIFACT_SECTIONS: SystemDesignSectionId[] = [
  "architecture",
  "data-model",
  "flows",
];

export type DesignBox = {
  id: string;
  label: string;
  column: "client" | "service" | "data";
};

export type DesignArrow = {
  from: string;
  to: string;
  label?: string;
};

export type DesignSection = {
  id: SystemDesignSectionId;
  say: string;
  example: string;
};

export type SystemDesignSpec = {
  title: string;
  sections: DesignSection[];
  boxes: DesignBox[];
  arrows: DesignArrow[];
};

const BOX_W = 200;
const BOX_H = 72;
const BOX_GAP = 48;
const ROLE_X = {
  client: 24,
  entry: 250,
  edge: 490,
  api: 730,
  worker: 970,
  data: 1210,
} as const;

type FlowRole = keyof typeof ROLE_X;

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function clipBlock(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r/g, "").trim().slice(0, max);
}

/** A box that names nothing: N/A, none, not applicable, and the same words with punctuation. */
function isPlaceholderLabel(label: string): boolean {
  const words = label
    .replace(/[\uFF0F\u2044\u2215]/g, "/")
    .toLowerCase()
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!words || words === "/" || words === "...") return true;
  return /^(n\/?a|na|none|null|nil|tbd|todo|unknown|placeholder|not applicable|not needed|nothing|unused|skip|empty|no storage|no object storage)$/.test(
    words,
  );
}

function slug(value: string, fallback: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return cleaned || fallback;
}

function columnFor(label: string, hinted?: string): DesignBox["column"] {
  if (hinted === "client" || hinted === "service" || hinted === "data") {
    return hinted;
  }
  if (/\b(client|browser|app|mobile|user)\b/i.test(label)) return "client";
  if (
    /\b(postgres|mysql|sql|database|db|mongo|redis|cache|s3|blob|object|store|queue)\b/i.test(
      label,
    )
  ) {
    return "data";
  }
  return "service";
}

const FALLBACK_BOXES: DesignBox[] = [
  { id: "client", label: "Client", column: "client" },
  { id: "api", label: "API", column: "service" },
  { id: "auth", label: "Auth", column: "service" },
  { id: "worker", label: "Worker", column: "service" },
  { id: "db", label: "Database", column: "data" },
  { id: "objects", label: "Object store", column: "data" },
];

function readBoxes(raw: unknown): DesignBox[] {
  if (!Array.isArray(raw)) return [];
  const boxes: DesignBox[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const label = clip(rec.label ?? rec.name, 22);
    if (!label || isPlaceholderLabel(label)) continue;
    let id = slug(String(rec.id ?? label), `box-${boxes.length + 1}`);
    if (seen.has(id)) id = `${id}-${boxes.length + 1}`;
    seen.add(id);
    boxes.push({
      id,
      label,
      column: columnFor(label, typeof rec.column === "string" ? rec.column : undefined),
    });
    if (boxes.length >= 10) break;
  }
  return boxes;
}

function readArrows(raw: unknown, ids: Set<string>): DesignArrow[] {
  if (!Array.isArray(raw)) return [];
  const arrows: DesignArrow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const from = slug(String(rec.from ?? ""), "");
    const to = slug(String(rec.to ?? ""), "");
    if (!from || !to || from === to || !ids.has(from) || !ids.has(to)) continue;
    const label = clip(rec.label, 18);
    arrows.push({ from, to, ...(label ? { label } : {}) });
    if (arrows.length >= 12) break;
  }
  return arrows;
}

function readSections(raw: unknown): DesignSection[] {
  const byId = new Map<SystemDesignSectionId, DesignSection>();
  const list = Array.isArray(raw) ? raw : [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = String(rec.id ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-") as SystemDesignSectionId;
    if (!SYSTEM_DESIGN_SECTION_IDS.includes(id) || byId.has(id)) continue;
    byId.set(id, {
      id,
      say: clip(rec.say ?? rec.summary, 600),
      example: clipBlock(rec.example ?? rec.artifact, 900),
    });
  }
  return SYSTEM_DESIGN_SECTION_IDS.map(
    (id) => byId.get(id) ?? { id, say: "", example: "" },
  );
}

export function parseSystemDesignSpec(raw: unknown): SystemDesignSpec {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const boxes = readBoxes(obj.boxes ?? obj.nodes);
  const used = boxes.length ? boxes : FALLBACK_BOXES.map((box) => ({ ...box }));
  const ids = new Set(used.map((box) => box.id));
  return {
    title: clip(obj.title, 80) || "System design",
    sections: readSections(obj.sections),
    boxes: used,
    arrows: readArrows(obj.arrows ?? obj.edges, ids),
  };
}

export function designGaps(spec: SystemDesignSpec): SystemDesignSectionId[] {
  return spec.sections
    .filter((section) => {
      if (!section.say) return true;
      if (ARTIFACT_SECTIONS.includes(section.id) && !section.example) return true;
      return false;
    })
    .map((section) => section.id);
}

export function applyDesignRepair(
  spec: SystemDesignSpec,
  repair: unknown,
): SystemDesignSpec {
  const patch = parseSystemDesignSpec(repair);
  const byId = new Map(spec.sections.map((section) => [section.id, section]));
  for (const section of patch.sections) {
    const current = byId.get(section.id);
    if (!current) continue;
    if (!current.say && section.say) current.say = section.say;
    if (!current.example && section.example) current.example = section.example;
  }
  return spec;
}

function isPrimaryDatabase(box: DesignBox): boolean {
  return (
    box.column === "data" &&
    /postgres|mysql|mongo|\b(sql|database|db)\b/i.test(box.label) &&
    !/\b(cache|redis|queue|s3|blob|object)\b/i.test(box.label)
  );
}

function isApiBox(box: DesignBox): boolean {
  const role = flowRole(box);
  return role === "client" || role === "entry" || role === "edge" || role === "api";
}

function highlightFor(
  id: SystemDesignSectionId,
  boxes: DesignBox[],
): string[] {
  const match = (re: RegExp) =>
    boxes.filter((box) => re.test(box.label)).map((box) => box.id);
  if (id === "security") {
    const auth = match(/\bauth|login|session|token\b/i);
    return auth.length ? auth : match(/\bapi|gateway\b/i).slice(0, 1);
  }
  if (id === "data-model") {
    const store = match(/\b(s3|blob|object|file|store|cache|redis)\b/i);
    return store.length ? store : boxes.filter((b) => b.column === "data").map((b) => b.id).slice(0, 1);
  }
  if (id === "reliability") return match(/\bapi|gateway|worker\b/i).slice(0, 2);
  if (id === "deployment" || id === "observability" || id === "scaling") {
    return boxes.filter((box) => box.column !== "client").map((box) => box.id).slice(0, 4);
  }
  return [];
}

/** CDN and WAF sit in front only when the design is for a large or public audience. */
export function needsCdnWaf(scale: string): boolean {
  const text = scale.toLowerCase();
  if (/\b(few thousand|hundreds|small|team|prototype|startup|personal|internal)\b/.test(text)) {
    return false;
  }
  return /\b(million|billion|global|worldwide|internet|public|ddos|viral|100k|thousands)\b/.test(
    text,
  );
}

function flowRole(box: DesignBox): FlowRole {
  const label = box.label;
  if (/\b(internet|cdn|waf)\b/i.test(label)) return "entry";
  if (box.column === "client" || /\b(client|browser|mobile)\b/i.test(label)) {
    return "client";
  }
  if (/\b(load balancer|lb)\b/i.test(label)) return "edge";
  if (/\bwebsocket|socket\b/i.test(label)) return "worker";
  if (/\bapi\b/i.test(label)) return "api";
  if (box.column === "data" || /\b(postgres|mysql|sql|database|redis|mongo|queue|store)\b/i.test(label)) {
    return "data";
  }
  return "worker";
}

function isPerson(box: DesignBox): boolean {
  return box.id === "user" || /^user$/i.test(box.label.trim());
}

function isSocket(box: DesignBox): boolean {
  return /\bwebsocket|socket\b/i.test(box.label);
}

function isBus(box: DesignBox): boolean {
  return /\bredis\b/i.test(box.label) && !box.id.startsWith("redis-");
}

function withDeployment(boxes: DesignBox[]): DesignBox[] {
  if (!boxes.some((box) => flowRole(box) === "api")) return boxes;
  if (boxes.some((box) => box.id === "deploy-aws")) return boxes;
  return [
    ...boxes,
    { id: "deploy-aws", label: "AWS", column: "service" },
    { id: "deploy-public", label: "Public subnet", column: "service" },
    { id: "deploy-private", label: "Private subnet", column: "service" },
    { id: "deploy-lb", label: "Load Balancer", column: "service" },
    { id: "deploy-api", label: "ECS API", column: "service" },
    { id: "deploy-ws", label: "ECS WS", column: "service" },
    { id: "deploy-workers", label: "Workers", column: "service" },
    { id: "deploy-redis", label: "Redis Cluster", column: "data" },
    { id: "deploy-pg", label: "PostgreSQL", column: "data" },
  ];
}

function withGuards(boxes: DesignBox[]): DesignBox[] {
  if (!boxes.some((box) => flowRole(box) === "api")) return boxes;
  const extra: DesignBox[] = [];
  if (!boxes.some((box) => box.id === "rate-limiter")) {
    extra.push({
      id: "rate-limiter",
      label: "Rate Limiter",
      column: "service",
    });
  }
  if (!boxes.some((box) => box.id === "obs-logs")) {
    extra.push(
      { id: "obs-app", label: "Application", column: "service" },
      { id: "obs-logs", label: "Logs\nLoki", column: "service" },
      { id: "obs-metrics", label: "Metrics\nPrometheus", column: "service" },
      { id: "obs-traces", label: "Traces\nTempo", column: "service" },
      { id: "obs-platform", label: "Observability platform\nGrafana", column: "service" },
      { id: "obs-alerts", label: "Alerts\nAlertmanager", column: "service" },
    );
  }
  return [...boxes, ...extra];
}

function withMessageStates(boxes: DesignBox[]): DesignBox[] {
  if (!boxes.some((box) => box.id === "table-messages")) return boxes;
  if (boxes.some((box) => box.id === "state-sent")) return boxes;
  return [
    ...boxes,
    { id: "state-sent", label: "SENT", column: "data" },
    { id: "state-delivered", label: "DELIVERED", column: "data" },
    { id: "state-read", label: "READ", column: "data" },
  ];
}

function withRedisRoles(boxes: DesignBox[], scale: string): DesignBox[] {
  const bus = boxes.find(isBus);
  if (!bus || boxes.some((box) => box.id === "redis-pubsub")) return boxes;
  const separate = needsCdnWaf(scale);
  const roles = separate
    ? [
        ["redis-pubsub", "Pub/Sub cluster"],
        ["redis-cache", "Session cluster"],
        ["redis-limit", "Rate-limit cluster"],
      ]
    : [
        ["redis-pubsub", "Pub/Sub"],
        ["redis-cache", "Session / cache"],
        ["redis-limit", "Rate limiting"],
      ];
  return [
    ...boxes,
    ...roles.map(([id, label]) => ({
      id: id!,
      label: label!,
      column: "data" as const,
    })),
  ];
}

function redisDecision(separate: boolean): string {
  const sharing = separate
    ? "Pub/sub, sessions, and rate limits each get their own Redis cluster."
    : "Pub/sub, sessions, and rate limits share one Redis. Split them into clusters when the load grows.";
  return `${sharing} Pub/Sub does not keep a message if the subscriber is disconnected. Use Redis Streams, Kafka, SQS, or RabbitMQ when delivery must survive that.`;
}

/** Two socket servers and two clients, so Redis is the hop between them. */
function isEntity(box: DesignBox): boolean {
  return box.id.startsWith("table-");
}

const CHAT_TABLES = [
  { id: "table-users", title: "Users", fields: ["id", "email", "password_hash"] },
  { id: "table-conversations", title: "Conversations", fields: ["id", "created_at"] },
  {
    id: "table-members",
    title: "ConversationMembers",
    fields: ["conversation_id", "user_id"],
  },
  {
    id: "table-messages",
    title: "Messages",
    fields: ["id", "sender_id", "conversation_id", "created_at", "status", "client_message_id"],
  },
] as const;

function isChatDesign(boxes: DesignBox[]): boolean {
  return boxes.some((box) =>
    /\b(message|chat|conversation|websocket)\b/i.test(box.label),
  );
}

/** Major tables under the primary database, for a chat design. */
function withSchema(boxes: DesignBox[]): DesignBox[] {
  if (!isChatDesign(boxes) || boxes.some(isEntity)) return boxes;
  const database = boxes.find(
    (box) =>
      flowRole(box) === "data" &&
      /postgres|mysql|mongo|\b(sql|database|db)\b/i.test(box.label) &&
      !isBus(box),
  );
  if (!database) return boxes;
  return [
    ...boxes,
    ...CHAT_TABLES.map((table) => ({
      id: table.id,
      label: [table.title, ...table.fields].join("\n"),
      column: "data" as const,
    })),
  ];
}

function withSocketFanout(boxes: DesignBox[]): DesignBox[] {
  const sockets = boxes.filter(isSocket);
  if (!sockets.length || !boxes.some(isBus)) return boxes;
  const rest = boxes.filter((box) => !isSocket(box));
  const apps = rest.filter((box) => flowRole(box) === "client" && !isPerson(box));
  const renamed = rest.map((box) =>
    apps.length < 2 && apps[0] && box.id === apps[0].id
      ? { ...box, label: "Web Client A" }
      : box,
  );
  const extra: DesignBox[] =
    apps.length < 2
      ? [{ id: "web-client-b", label: "Web Client B", column: "client" }]
      : [];
  return [
    ...renamed,
    ...extra,
    { id: "ws-1", label: "WebSocket Server 1", column: "service" },
    { id: "ws-2", label: "WebSocket Server 2", column: "service" },
  ];
}

function withUser(boxes: DesignBox[]): DesignBox[] {
  const hasAuth = boxes.some((box) => /\bauth\b/i.test(box.label));
  if (!hasAuth || boxes.some(isPerson)) return boxes;
  return [{ id: "user", label: "User", column: "client" }, ...boxes];
}

function withFrontDoor(boxes: DesignBox[], scale = ""): DesignBox[] {
  const roles = boxes.map(flowRole);
  if (!roles.includes("client") || !roles.includes("api") && !roles.includes("worker")) {
    return boxes;
  }
  const front: DesignBox[] = [];
  if (!roles.includes("edge")) {
    front.push({ id: "load-balancer", label: "Load Balancer", column: "service" });
  }
  if (!boxes.some((box) => /\binternet\b/i.test(box.label))) {
    front.unshift({ id: "internet", label: "Internet", column: "service" });
  }
  if (
    needsCdnWaf(scale) &&
    !boxes.some((box) => /\b(cdn|waf)\b/i.test(box.label))
  ) {
    const lbAt = front.findIndex((box) => box.id === "load-balancer");
    const shield = { id: "cdn-waf", label: "CDN / WAF", column: "service" as const };
    if (lbAt >= 0) front.splice(lbAt, 0, shield);
    else front.push(shield);
  }
  return [...front, ...boxes];
}

type LabeledArrow = DesignArrow & { lane?: "above" | "below" };

/** Directed, labeled hops: who talks to whom, and over what. */
function relationships(boxes: DesignBox[]): LabeledArrow[] {
  const of = (role: FlowRole) => boxes.filter((box) => flowRole(box) === role);
  const clients = of("client");
  const internet = of("entry").find((box) => /\binternet\b/i.test(box.label));
  const shield = of("entry").find((box) => /\b(cdn|waf)\b/i.test(box.label));
  const edge = of("edge")[0];
  const api = of("api")[0] ?? of("worker")[0];
  const workers = of("worker");
  const sockets = workers.filter((box) => /\bwebsocket|socket\b/i.test(box.label));
  const called = workers.filter((box) => !sockets.includes(box));
  const sql = of("data").filter((box) =>
    /postgres|mysql|mongo|\b(sql|database|db)\b/i.test(box.label) &&
    !/\b(redis|cache|queue|pub)\b/i.test(box.label),
  );
  const buses = of("data").filter((box) => /\b(redis|pub|queue|bus|cache)\b/i.test(box.label));
  const arrows: LabeledArrow[] = [];
  const add = (
    from: string | undefined,
    to: string | undefined,
    label: string,
    lane?: "above" | "below",
  ) => {
    if (!from || !to || from === to) return;
    if (arrows.some((arrow) => arrow.from === from && arrow.to === to && arrow.label === label)) {
      return;
    }
    arrows.push({ from, to, label, ...(lane ? { lane } : {}) });
  };

  const people = clients.filter(isPerson);
  const apps = clients.filter((box) => !isPerson(box));
  const auth = called.find((box) => /\bauth\b/i.test(box.label));
  const door = internet ?? shield ?? edge ?? api;
  for (const person of people) add(person.id, apps[0]?.id, "uses");
  for (const client of apps) add(client.id, door?.id, "HTTPS");
  if (auth && apps[0]) {
    add(apps[0].id, auth.id, "POST /login");
    add(auth.id, sql[0]?.id, "lookup");
    add(auth.id, apps[0].id, "access token");
    add(apps[0].id, api?.id, "Bearer JWT", "below");
  }
  if (internet && shield) add(internet.id, shield.id, "HTTPS");
  const intoBalancer = shield ?? internet;
  if (intoBalancer && edge) add(intoBalancer.id, edge.id, "HTTPS");
  const limiter = boxes.find((box) => box.id === "rate-limiter");
  if (edge && limiter && api && edge.id !== api.id) {
    add(edge.id, limiter.id, "check");
    add(limiter.id, api.id, "allowed");
    add(limiter.id, boxes.find((box) => box.id === "redis-limit")?.id, "counters");
  } else if (edge && api && edge.id !== api.id) {
    add(edge.id, api.id, "HTTP");
  }
  add(api?.id, "obs-app", "telemetry");
  for (const signal of ["obs-logs", "obs-metrics", "obs-traces"]) {
    add("obs-app", signal, "emit");
    add(signal, "obs-platform", "collect");
  }
  add("obs-platform", "obs-alerts", "page");
  const pubsub = boxes.find((box) => box.id === "redis-pubsub");
  const fanout = sockets.length >= 2 ? (pubsub ?? buses[0]) : undefined;
  const message = called.find((box) => /\bmessage\b/i.test(box.label));
  add(message?.id, "obs-app", "telemetry");
  if (fanout) {
    const [first, second] = sockets;
    add(apps[0]?.id, first?.id, "Hello");
    add(first?.id, message?.id, "validate");
    add(message?.id, sql[0]?.id, "persist");
    add(sql[0]?.id, message?.id, "Message saved");
    add(first?.id, fanout.id, "publish");
    add(fanout.id, second?.id, "subscribe");
    add(second?.id, apps[1]?.id, "deliver");
    add(fanout.id, apps[1]?.id, "not delivered", "below");
    add(apps[1]?.id, second?.id, "reconnect");
    add(second?.id, message?.id, "since last_message_id");
    add(message?.id, sql[0]?.id, "fetch");
    add(sql[0]?.id, apps[1]?.id, "missed messages");
    const messagesTable = boxes.find((box) => box.id === "table-messages");
    add(message?.id, "state-sent", "row saved");
    add("state-sent", messagesTable?.id, "status");
    add("state-sent", "state-delivered", "then");
    add(second?.id, "state-delivered", "handed over");
    add("state-delivered", messagesTable?.id, "status");
    add("state-delivered", "state-read", "then");
    add(apps[1]?.id, "state-read", "receipt");
    add("state-read", messagesTable?.id, "status");
    add(apps[0]?.id, message?.id, "retry abc123", "below");
    add(message?.id, messagesTable?.id, "unique client_message_id");
    add(messagesTable?.id, message?.id, "same row");
  } else {
    for (const socket of sockets) {
      add((edge ?? api)?.id, socket.id, "WebSocket");
    }
  }
  for (const service of called) {
    add(
      api?.id,
      service.id,
      auth && service.id === auth.id
        ? "verify JWT"
        : auth
          ? "authorized"
          : "call",
    );
  }
  const writer =
    called.find((box) => /\b(message|worker)\b/i.test(box.label)) ?? api;
  for (const store of sql) {
    if (fanout && message && store.id === sql[0]?.id) continue;
    add(writer?.id, store.id, "SQL");
  }
  const database = sql[0];
  for (const table of boxes.filter(isEntity)) {
    add(database?.id, table.id, "has");
  }
  const redisParent = buses[0];
  const separateRedis = boxes.some(
    (box) => box.id === "redis-pubsub" && /cluster/i.test(box.label),
  );
  for (const role of boxes.filter((box) => box.id.startsWith("redis-"))) {
    add(redisParent?.id, role.id, separateRedis ? "own cluster" : "shared");
  }
  add("deploy-aws", "deploy-public", "contains");
  add("deploy-aws", "deploy-private", "contains");
  add("deploy-public", "deploy-lb", "hosts");
  add("deploy-lb", "deploy-api", "HTTP");
  add("deploy-private", "deploy-api", "runs");
  add("deploy-private", "deploy-ws", "runs");
  add("deploy-private", "deploy-workers", "runs");
  add("deploy-workers", "deploy-redis", "cluster");
  add("deploy-redis", "deploy-pg", "database");
  for (const bus of buses) {
    if (fanout) continue;
    add((writer ?? api)?.id, bus.id, "publish");
    for (const socket of sockets) {
      add(socket.id, bus.id, "subscribe");
      add(bus.id, socket.id, "fanout");
    }
  }
  return arrows;
}

function placeBoxes(boxes: DesignBox[]): Map<string, { x: number; y: number }> {
  const entities = boxes.filter(isEntity);
  const groups = new Map<FlowRole, DesignBox[]>();
  for (const box of boxes) {
    if (
      isEntity(box) ||
      box.id.startsWith("redis-") ||
      box.id.startsWith("state-") ||
      box.id.startsWith("obs-") ||
      box.id.startsWith("deploy-") ||
      box.id === "rate-limiter"
    ) {
      continue;
    }
    const role = flowRole(box);
    const list = groups.get(role) ?? [];
    list.push(box);
    groups.set(role, list);
  }
  const tallest = Math.max(1, ...[...groups.values()].map((list) => list.length));
  const span = tallest * (BOX_H + BOX_GAP) - BOX_GAP;
  const placed = new Map<string, { x: number; y: number }>();
  for (const [role, list] of groups) {
    const columnSpan = list.length * (BOX_H + BOX_GAP) - BOX_GAP;
    let y = 120 + Math.max(0, (span - columnSpan) / 2);
    for (const box of list) {
      placed.set(box.id, { x: ROLE_X[role], y });
      y += BOX_H + BOX_GAP;
    }
  }
  if (entities.length) {
    const database = boxes.find(
      (box) =>
        !isEntity(box) &&
        flowRole(box) === "data" &&
        /postgres|mysql|mongo|\b(sql|database|db)\b/i.test(box.label) &&
        !isBus(box),
    );
    const anchor = database ? placed.get(database.id) : undefined;
    const entityW = 188;
    const gap = 20;
    const rowW = entities.length * entityW + (entities.length - 1) * gap;
    let x = Math.max(24, (anchor?.x ?? 24) + BOX_W / 2 - rowW / 2);
    const y = (anchor?.y ?? 120) + BOX_H + 72;
    for (const box of entities) {
      placed.set(box.id, { x, y });
      x += entityW + gap;
    }
  }
  const redisParent = boxes.find(isBus);
  const redisAt = redisParent ? placed.get(redisParent.id) : undefined;
  let roleY = redisAt?.y ?? 120;
  const roleX = (redisAt?.x ?? 24) + BOX_W + 36;
  for (const box of boxes.filter((item) => item.id.startsWith("redis-"))) {
    placed.set(box.id, { x: roleX, y: roleY });
    roleY += 68;
  }
  const messageAt = placed.get("table-messages");
  let stateY = (messageAt?.y ?? 480) + 150;
  const stateX = messageAt?.x ?? 24;
  for (const box of boxes.filter((item) => item.id.startsWith("state-"))) {
    placed.set(box.id, { x: stateX, y: stateY });
    stateY += 56;
  }
  const edgeAt = placed.get(
    boxes.find((box) => flowRole(box) === "edge")?.id ?? "",
  );
  const apiAt = placed.get(boxes.find((box) => flowRole(box) === "api")?.id ?? "");
  const limiterBox = boxes.find((box) => box.id === "rate-limiter");
  if (limiterBox && edgeAt && apiAt) {
    placed.set(limiterBox.id, {
      x: apiAt.x,
      y: Math.max(24, apiAt.y - 130),
    });
  }
  const signals = ["obs-logs", "obs-metrics", "obs-traces"]
    .map((id) => boxes.find((box) => box.id === id))
    .filter((box): box is DesignBox => Boolean(box));
  const appBox = boxes.find((box) => box.id === "obs-app");
  const platform = boxes.find((box) => box.id === "obs-platform");
  const alerts = boxes.find((box) => box.id === "obs-alerts");
  if (signals.length && appBox && platform && alerts) {
    const top = 80;
    const signalW = 180;
    const gap = 28;
    const rowW = signals.length * signalW + (signals.length - 1) * gap;
    const left = 24;
    signals.forEach((box, index) => {
      placed.set(box.id, { x: left + index * (signalW + gap), y: top + 110 });
    });
    const mid = left + rowW / 2 - BOX_W / 2;
    placed.set(appBox.id, { x: mid, y: top });
    placed.set(platform.id, { x: mid, y: top + 250 });
    placed.set(alerts.id, { x: mid, y: top + 360 });
  }
  const aws = boxes.find((box) => box.id === "deploy-aws");
  const publicNet = boxes.find((box) => box.id === "deploy-public");
  const privateNet = boxes.find((box) => box.id === "deploy-private");
  if (aws && publicNet && privateNet) {
    placed.set(aws.id, { x: 280, y: 40 });
    placed.set(publicNet.id, { x: 40, y: 160 });
    placed.set(privateNet.id, { x: 360, y: 160 });
    const tier: Array<[string, number, number]> = [
      ["deploy-lb", 40, 300],
      ["deploy-api", 280, 300],
      ["deploy-ws", 500, 300],
      ["deploy-workers", 720, 300],
      ["deploy-redis", 500, 440],
      ["deploy-pg", 500, 560],
    ];
    for (const [id, x, y] of tier) {
      if (boxes.some((box) => box.id === id)) placed.set(id, { x, y });
    }
  }
  return placed;
}

function geo(
  box: DesignBox,
  at: { x: number; y: number },
  color: ExperimentColor,
): ExperimentShape {
  return {
    id: box.id,
    type: "geo",
    geo: "rectangle",
    x: at.x,
    y: at.y,
    w: box.label.includes("\n") ? 188 : BOX_W,
    h: box.label.includes("\n")
      ? 28 + box.label.split("\n").length * 18
      : BOX_H,
    label: box.label,
    color,
    fill: "semi",
    role: "part",
  };
}

function boxColor(box: DesignBox): "blue" | "orange" | "green" | "violet" {
  const role = flowRole(box);
  if (role === "client") return "blue";
  if (role === "entry" || role === "edge") return "orange";
  if (role === "data") return "violet";
  return "green";
}

function diagramNode(
  id: string,
  label: string,
  x: number,
  y: number,
  color: ExperimentColor,
): ExperimentShape {
  const lines = label.split("\n").length;
  return {
    id,
    type: "geo",
    geo: "rectangle",
    x,
    y,
    w: label.includes("\n") ? 188 : 200,
    h: label.includes("\n") ? 28 + lines * 18 : 72,
    label,
    color,
    fill: "semi",
    role: "part",
  };
}

function sheetBottom(shapes: ExperimentShape[]): number {
  let bottom = 0;
  for (const shape of shapes) {
    if (shape.type === "geo") bottom = Math.max(bottom, shape.y + shape.h);
    else if (shape.type === "text" || shape.type === "note") bottom = Math.max(bottom, shape.y + 48);
  }
  return bottom;
}

function placeSheet(
  heading: string,
  key: string,
  shapes: ExperimentShape[],
  cursor: number,
): { shapes: ExperimentShape[]; next: number } {
  const nodes = shapes.filter((shape) => shape.type === "geo" || shape.type === "text");
  const minY = nodes.length ? Math.min(...nodes.map((shape) => shape.y)) : 0;
  const shift = cursor + 72 - minY;
  const moved = shapes.map((shape) =>
    shape.type === "arrow" || shape.type === "callout" ? shape : { ...shape, y: shape.y + shift },
  );
  const labeled: ExperimentShape[] = [
    {
      id: `heading-${key}`,
      type: "text",
      x: 24,
      y: cursor,
      text: heading,
      role: "title",
      color: "black",
    },
    ...moved,
  ];
  return { shapes: labeled, next: sheetBottom(labeled) + 140 };
}

function diagramArrow(from: string, to: string, label: string): ExperimentShape {
  return {
    id: `arrow-${slug(`${from}-${to}-${label}`, label)}`,
    type: "arrow",
    from,
    to,
    label,
    color: "grey",
  };
}

function highLevelDiagram(chat: boolean, scale: string): ExperimentShape[] {
  const cdn = needsCdnWaf(scale);
  const shapes: ExperimentShape[] = [
    diagramNode("internet", "Internet", 340, 40, "orange"),
  ];
  let y = 160;
  if (cdn) {
    shapes.push(diagramNode("cdn-waf", "CDN / WAF", 340, y, "orange"));
    shapes.push(diagramArrow("internet", "cdn-waf", "HTTPS"));
    y += 130;
    shapes.push(diagramNode("load-balancer", "Load Balancer", 340, y, "orange"));
    shapes.push(diagramArrow("cdn-waf", "load-balancer", "HTTPS"));
  } else {
    shapes.push(diagramNode("load-balancer", "Load Balancer", 340, y, "orange"));
    shapes.push(diagramArrow("internet", "load-balancer", "HTTPS"));
  }
  if (!chat) {
    shapes.push(diagramNode("client", "Client", 40, 40, "blue"));
    shapes.push(diagramArrow("client", "internet", "HTTPS"));
    shapes.push(diagramNode("api", "API", 340, y + 140, "green"));
    shapes.push(diagramNode("db", "Database", 340, y + 280, "violet"));
    shapes.push(diagramArrow("load-balancer", "api", "HTTPS"));
    shapes.push(diagramArrow("api", "db", "SQL"));
    return shapes;
  }
  const row = y + 150;
  shapes.push(
    diagramNode("hl-api", "API Service\nECS", 40, row, "green"),
    diagramNode("hl-ws", "WebSocket\nService", 560, row, "green"),
    diagramArrow("load-balancer", "hl-api", "HTTPS"),
    diagramArrow("load-balancer", "hl-ws", "WebSocket"),
    diagramNode("hl-auth", "Auth", 24, row + 160, "green"),
    diagramNode("hl-msg", "Message\nService", 230, row + 160, "green"),
    diagramNode("hl-redis", "Redis", 440, row + 160, "violet"),
    diagramNode("hl-pubsub", "Redis Pub/Sub", 650, row + 160, "violet"),
    diagramArrow("hl-api", "hl-auth", "calls"),
    diagramArrow("hl-api", "hl-msg", "calls"),
    diagramArrow("hl-api", "hl-redis", "cache"),
    diagramArrow("hl-ws", "hl-pubsub", "publish"),
    diagramNode("hl-pg", "PostgreSQL", 300, row + 340, "violet"),
    diagramArrow("hl-auth", "hl-pg", "lookup"),
    diagramArrow("hl-msg", "hl-pg", "write"),
    diagramArrow("hl-redis", "hl-pg", "read"),
    diagramArrow("hl-pubsub", "hl-pg", "fanout"),
  );
  return shapes;
}

function dataModelDiagram(chat: boolean): ExperimentShape[] {
  if (!chat) {
    return [diagramNode("db", "Database", 80, 80, "violet")];
  }
  const shapes: ExperimentShape[] = [
    diagramNode("dm-pg", "PostgreSQL", 360, 24, "violet"),
  ];
  CHAT_TABLES.forEach((table, index) => {
    const id = table.id;
    shapes.push(
      diagramNode(id, [table.title, ...table.fields].join("\n"), 24 + index * 230, 180, "violet"),
      diagramArrow("dm-pg", id, "has"),
    );
  });
  shapes.push(
    diagramNode("state-sent", "SENT", 720, 420, "green"),
    diagramNode("state-delivered", "DELIVERED", 720, 520, "green"),
    diagramNode("state-read", "READ", 720, 620, "green"),
    diagramArrow("state-sent", "table-messages", "status"),
    diagramArrow("state-delivered", "state-read", "then"),
    diagramArrow("state-read", "table-messages", "status"),
  );
  return shapes;
}

function genericFlowDiagram(): ExperimentShape[] {
  return [
    diagramNode("flow-client", "Client", 200, 24, "blue"),
    diagramNode("flow-api", "API", 200, 160, "green"),
    diagramNode("flow-db", "Database", 200, 300, "violet"),
    diagramNode("flow-response", "Response", 200, 440, "blue"),
    diagramArrow("flow-client", "flow-api", "request"),
    diagramArrow("flow-api", "flow-db", "read"),
    diagramArrow("flow-db", "flow-response", "response"),
  ];
}

function genericReliabilityDiagram(): ExperimentShape[] {
  return [
    diagramNode("rel-request", "Request", 200, 24, "blue"),
    diagramNode("rel-api", "API", 200, 160, "green"),
    diagramNode("rel-db", "Database", 200, 300, "violet"),
    diagramNode("rel-fail", "Timeout", 460, 160, "orange"),
    diagramNode("rel-retry", "Retry", 460, 300, "orange"),
    diagramArrow("rel-request", "rel-api", "send"),
    diagramArrow("rel-api", "rel-db", "read"),
    diagramArrow("rel-api", "rel-fail", "timeout"),
    diagramArrow("rel-fail", "rel-retry", "try again"),
    diagramArrow("rel-retry", "rel-api", "same request"),
  ];
}

function messageFlowDiagram(): ExperimentShape[] {
  return [
    diagramNode("mf-user-a", "User A", 200, 24, "blue"),
    diagramNode("mf-ws-1", "WS Server", 200, 150, "green"),
    diagramNode("mf-msg", "Message Service", 200, 280, "green"),
    diagramNode("mf-pg", "PostgreSQL", 24, 430, "violet"),
    diagramNode("mf-saved", "Message saved", 24, 560, "violet"),
    diagramNode("mf-pubsub", "Redis Pub/Sub", 430, 430, "violet"),
    diagramNode("mf-ws-2", "WS Server", 430, 560, "green"),
    diagramNode("mf-user-b", "User B", 430, 690, "blue"),
    diagramArrow("mf-user-a", "mf-ws-1", "WebSocket"),
    diagramArrow("mf-ws-1", "mf-msg", "authenticate"),
    diagramArrow("mf-msg", "mf-pg", "write"),
    diagramArrow("mf-pg", "mf-saved", "Message saved"),
    diagramArrow("mf-msg", "mf-pubsub", "publish"),
    diagramArrow("mf-pubsub", "mf-ws-2", "subscribe"),
    diagramArrow("mf-ws-2", "mf-user-b", "WebSocket"),
  ];
}

function sequenceDiagram(): ExperimentShape[] {
  const columns = ["User", "Client", "API", "Message DB", "Redis", "WS Server", "Recipient"];
  const steps: Array<[number, string, string]> = [
    [0, "seq-user", "Send"],
    [1, "seq-client", "Send"],
    [2, "seq-api", "Send"],
    [3, "seq-db", "Save"],
    [2, "seq-saved", "Saved"],
    [4, "seq-redis", "Publish"],
    [5, "seq-ws", "Event"],
    [6, "seq-recipient", "Deliver"],
  ];
  const shapes: ExperimentShape[] = columns.map((label, index) =>
    diagramNode(`seq-head-${index}`, label, 16 + index * 170, 24, index === 0 || index === 6 ? "blue" : "green"),
  );
  steps.forEach(([column, id, label], index) => {
    shapes.push(diagramNode(id, label, 16 + column * 170, 150 + index * 88, "orange"));
  });
  const labels = ["Send", "Send", "Save", "saved", "Publish", "event", "deliver"];
  for (let index = 0; index < steps.length - 1; index += 1) {
    shapes.push(diagramArrow(steps[index]![1], steps[index + 1]![1], labels[index]!));
  }
  return shapes;
}

function reliabilityDiagram(): ExperimentShape[] {
  return [
    diagramNode("rel-send", "Send Message", 250, 24, "blue"),
    diagramNode("rel-msg", "Message Service", 250, 140, "green"),
    diagramNode("rel-pg", "PostgreSQL", 250, 260, "violet"),
    diagramNode("rel-persisted", "Message persisted", 250, 380, "violet"),
    diagramNode("rel-online", "User online", 24, 520, "green"),
    diagramNode("rel-offline", "User offline", 480, 520, "orange"),
    diagramNode("rel-ws", "WebSocket", 24, 650, "green"),
    diagramNode("rel-delivered", "Delivered", 24, 780, "green"),
    diagramNode("rel-none", "No delivery", 480, 650, "orange"),
    diagramNode("rel-reconnect", "User reconnects", 480, 780, "blue"),
    diagramNode("rel-fetch", "Fetch missed messages", 480, 910, "green"),
    diagramNode("rel-pg-2", "PostgreSQL", 480, 1040, "violet"),
    diagramArrow("rel-send", "rel-msg", "send"),
    diagramArrow("rel-msg", "rel-pg", "write"),
    diagramArrow("rel-pg", "rel-persisted", "stored"),
    diagramArrow("rel-persisted", "rel-online", "online"),
    diagramArrow("rel-persisted", "rel-offline", "offline"),
    diagramArrow("rel-online", "rel-ws", "push"),
    diagramArrow("rel-ws", "rel-delivered", "delivered"),
    diagramArrow("rel-offline", "rel-none", "drop"),
    diagramArrow("rel-none", "rel-reconnect", "later"),
    diagramArrow("rel-reconnect", "rel-fetch", "since last id"),
    diagramArrow("rel-fetch", "rel-pg-2", "read"),
  ];
}

function productionDiagram(): ExperimentShape[] {
  return [
    diagramNode("prod-aws", "AWS", 300, 24, "orange"),
    diagramNode("prod-waf", "WAF", 300, 140, "orange"),
    diagramNode("prod-alb", "ALB", 300, 260, "orange"),
    diagramNode("prod-api", "ECS API Tasks", 40, 400, "green"),
    diagramNode("prod-ws", "ECS WebSocket Tasks", 520, 400, "green"),
    diagramNode("prod-pg", "PostgreSQL\nRDS", 24, 560, "violet"),
    diagramNode("prod-redis", "Redis Cluster", 280, 560, "violet"),
    diagramNode("prod-mon", "Monitoring\nLogs", 540, 560, "green"),
    diagramNode("prod-backups", "Backups", 24, 720, "violet"),
    diagramNode("prod-dr", "Disaster Recovery", 24, 850, "orange"),
    diagramArrow("prod-aws", "prod-waf", "edge"),
    diagramArrow("prod-waf", "prod-alb", "filter"),
    diagramArrow("prod-alb", "prod-api", "HTTPS"),
    diagramArrow("prod-alb", "prod-ws", "WebSocket"),
    diagramArrow("prod-api", "prod-pg", "SQL"),
    diagramArrow("prod-ws", "prod-redis", "pub/sub"),
    diagramArrow("prod-api", "prod-mon", "telemetry"),
    diagramArrow("prod-pg", "prod-backups", "snapshot"),
    diagramArrow("prod-backups", "prod-dr", "restore"),
  ];
}

function securityDiagram(): ExperimentShape[] {
  return [
    diagramNode("sec-user", "User", 24, 40, "blue"),
    diagramNode("sec-client", "Web Client", 250, 40, "blue"),
    diagramNode("sec-auth", "Auth", 480, 40, "green"),
    diagramNode("sec-pg", "PostgreSQL", 710, 40, "violet"),
    diagramNode("sec-api", "API", 250, 220, "green"),
    diagramArrow("sec-user", "sec-client", "uses"),
    diagramArrow("sec-client", "sec-auth", "POST /login"),
    diagramArrow("sec-auth", "sec-pg", "lookup"),
    diagramArrow("sec-auth", "sec-client", "access token"),
    diagramArrow("sec-client", "sec-api", "Bearer JWT"),
    diagramArrow("sec-api", "sec-auth", "verify JWT"),
  ];
}

function scalingDiagram(separate: boolean): ExperimentShape[] {
  const label = separate ? "own cluster" : "shared";
  return [
    diagramNode("redis", "Redis", 250, 40, "violet"),
    diagramNode("redis-pubsub", "Pub/Sub", 24, 200, "violet"),
    diagramNode("redis-cache", "Session / cache", 250, 200, "violet"),
    diagramNode("redis-limit", "Rate limiting", 490, 200, "violet"),
    diagramArrow("redis", "redis-pubsub", label),
    diagramArrow("redis", "redis-cache", label),
    diagramArrow("redis", "redis-limit", label),
  ];
}

function observeDiagram(): ExperimentShape[] {
  return [
    diagramNode("api", "API", 24, 24, "green"),
    diagramNode("obs-app", "Application", 250, 24, "green"),
    diagramArrow("api", "obs-app", "telemetry"),
    diagramNode("obs-logs", "Logs\nLoki", 24, 180, "green"),
    diagramNode("obs-metrics", "Metrics\nPrometheus", 250, 180, "green"),
    diagramNode("obs-traces", "Traces\nTempo", 490, 180, "green"),
    diagramNode("obs-platform", "Observability platform\nGrafana", 250, 360, "orange"),
    diagramNode("obs-alerts", "Alerts\nAlertmanager", 250, 520, "orange"),
    diagramArrow("obs-app", "obs-logs", "emit"),
    diagramArrow("obs-app", "obs-metrics", "emit"),
    diagramArrow("obs-app", "obs-traces", "emit"),
    diagramArrow("obs-logs", "obs-platform", "collect"),
    diagramArrow("obs-metrics", "obs-platform", "collect"),
    diagramArrow("obs-traces", "obs-platform", "collect"),
    diagramArrow("obs-platform", "obs-alerts", "page"),
  ];
}

/**
 * One diagram per section. The board is cleared when the diagram changes.
 * Do not pass the result through coerceLesson.
 */
export function compileSystemDesign(
  spec: SystemDesignSpec,
  question: string,
  scale = "",
): ExperimentLesson {
  const gaps = designGaps(spec);
  if (gaps.length) {
    throw new Error(
      `System design is missing ${gaps.map(sectionLabel).join(", ")}.`,
    );
  }

  const chat = isChatDesign(spec.boxes);
  const separateRedis = needsCdnWaf(scale);
  const beats: ExperimentBeat[] = spec.sections.map((section) => {
    let say = section.say;
    let shapes: ExperimentShape[] = [];
    let diagram: ExperimentBeat["diagram"];
    if (section.id === "requirements") {
      shapes = [
        {
          id: "sd-title",
          type: "text",
          x: 40,
          y: 24,
          text: spec.title,
          role: "title",
          color: "black",
        },
      ];
    } else if (section.id === "architecture") {
      diagram = "architecture";
      shapes = highLevelDiagram(chat, scale);
    } else if (section.id === "data-model") {
      diagram = "data";
      shapes = dataModelDiagram(chat);
      if (chat) {
        say = `${say} SENT is stored when the row is saved. DELIVERED is stored when the recipient's socket server hands the message over. READ is stored when that client sends a receipt. Each one updates Messages.status.`;
      }
    } else if (section.id === "flows") {
      diagram = "flow";
      shapes = chat ? messageFlowDiagram() : genericFlowDiagram();
    } else if (section.id === "scaling") {
      diagram = "scale";
      shapes = scalingDiagram(separateRedis);
      if (chat) say = `${say} ${redisDecision(separateRedis)}`;
    } else if (section.id === "reliability") {
      diagram = "reliability";
      shapes = chat ? reliabilityDiagram() : genericReliabilityDiagram();
      if (chat) {
        say = `${say} If the recipient is offline, the pub/sub event is not delivered. On reconnect the client fetches messages since last_message_id from PostgreSQL. A retry of the same client_message_id returns the original row.`;
      }
    } else if (section.id === "security") {
      diagram = "security";
      shapes = securityDiagram();
      say = `${say} A rate limiter in front of the API counts login attempts, messages per second, WebSocket connections, and API requests per minute.`;
    } else if (section.id === "observability") {
      diagram = "observe";
      shapes = observeDiagram();
      say = `${say} Services emit logs to Loki, metrics to Prometheus, and traces to Tempo. Grafana collects them and Alertmanager pages when a threshold breaks.`;
    } else if (section.id === "deployment") {
      diagram = "deploy";
      shapes = productionDiagram();
      say = `${say} WAF and the load balancer sit at the edge. API and socket tasks, RDS, and Redis run behind them. Postgres snapshots feed disaster recovery.`;
    }
    const beat: ExperimentBeat = {
      section: sectionLabel(section.id),
      ...(diagram ? { diagram } : {}),
      say,
      ...(section.example ? { example: section.example } : {}),
      shapes,
    };
    return beat;
  });
  if (chat) {
    const flowAt = beats.findIndex((beat) => beat.diagram === "flow");
    if (flowAt >= 0) {
      beats.splice(flowAt + 1, 0, {
        section: "Sequence",
        diagram: "sequence",
        say: "Follow one send. The client hands it to the API, the API stores it, then publishes. The other socket server delivers it to the recipient.",
        shapes: sequenceDiagram(),
      });
    }
  }
  let cursor = 0;
  for (const beat of beats) {
    if (!beat.shapes.length) continue;
    const placed = placeSheet(beat.section ?? "Diagram", beat.diagram ?? "sheet", beat.shapes, cursor);
    beat.shapes = placed.shapes;
    cursor = placed.next;
  }
  return {
    title: spec.title,
    question: question.slice(0, 160),
    beats,
  };
}
