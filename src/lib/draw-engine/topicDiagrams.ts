import type { DrawCommand } from "@/lib/draw-engine/commands";
import {
  reserve,
  type BoardLayout,
} from "@/lib/draw-engine/boardLayout";

export type TopicDiagramInput = {
  prompt: string;
  beatOrder: number;
  totalBeats?: number;
  beatId: string;
  t0Base: number;
  narration?: string;
  highlight?: string;
  layout?: BoardLayout;
};

type TopicKind = "uml_class" | "uml_sequence" | "process" | "generic";

/**
 * Structured, progressive diagrams for common tutoring topics.
 * Prefer this over dumping narration text onto the board.
 */
export function topicDiagramCommands(
  input: TopicDiagramInput,
): DrawCommand[] | null {
  const kind = detectTopic(input.prompt, input.narration, input.highlight, input.beatOrder);
  if (kind === "generic") return null;

  let cmds: DrawCommand[] | null = null;
  switch (kind) {
    case "uml_class":
      cmds = umlClassCommands(input);
      break;
    case "uml_sequence":
      cmds = umlSequenceCommands(input);
      break;
    case "process":
      cmds = processCommands(input);
      break;
    default:
      return null;
  }
  if (cmds?.length && input.layout) {
    registerTopicCommands(input.layout, cmds);
  }
  return cmds;
}

function registerTopicCommands(layout: BoardLayout, cmds: DrawCommand[]) {
  for (const cmd of cmds) {
    if (cmd.type === "rect") {
      reserve(layout, {
        id: cmd.id,
        x: cmd.x,
        y: cmd.y,
        w: cmd.w,
        h: cmd.h,
        kind: "content",
      });
    } else if (cmd.type === "text") {
      const font = cmd.fontSize ?? 16;
      reserve(layout, {
        id: cmd.id,
        x: cmd.x,
        y: cmd.y,
        w: Math.min(720, Math.max(24, cmd.text.length * font * 0.55)),
        h: font + 8,
        kind: "content",
      });
    }
  }
}

export function detectTopic(
  prompt: string,
  narration?: string,
  highlight?: string,
  beatOrder = 1,
): TopicKind {
  const promptBlob = prompt.toLowerCase();
  const narrBlob = `${narration ?? ""} ${highlight ?? ""}`.toLowerCase();

  const promptIsUml =
    /\buml\b/.test(promptBlob) || /\bclass\s+diagram\b/.test(promptBlob);
  const promptIsSequence = /\bsequence\s+diagram\b/.test(promptBlob);

  if (promptIsSequence) return "uml_sequence";

  if (promptIsUml) {
    // Later UML beats that teach sequence → switch diagram type.
    if (beatOrder >= 4 && /\bsequence\b/.test(narrBlob)) {
      return "uml_sequence";
    }
    return "uml_class";
  }

  if (/\bsequence\s+diagram\b/.test(narrBlob)) return "uml_sequence";
  if (/\bclass\s+diagram\b|\binheritance\b/.test(narrBlob)) return "uml_class";

  if (
    /\bprocess\b|\bpipeline\b|\bworkflow\b|\btimeline\b/.test(promptBlob)
  ) {
    return "process";
  }

  return "generic";
}

function umlClassCommands(input: TopicDiagramInput): DrawCommand[] {
  const { beatOrder, beatId, t0Base: t } = input;
  const model = inferDomainModel(input.prompt, input.narration, input.highlight);
  const cmds: DrawCommand[] = [];

  const parent = model.classes[0]!;
  const childA = model.classes[1]!;
  const childB = model.classes[2]!;

  // Beat 1: title + core/parent class
  if (beatOrder <= 1) {
    cmds.push(
      text(
        beatId,
        "title",
        t,
        `${model.domain} · UML class diagram`,
        80,
        40,
        22,
      ),
      ...classBox(beatId, "c0", t + 200, 340, 70, parent.name, parent.rows),
    );
  }

  // Beat 2: related class + association/inheritance into parent
  if (beatOrder === 2) {
    cmds.push(
      ...classBox(beatId, "c1", t, 100, 280, childA.name, childA.rows),
      arrow(beatId, "a1", t + 500, 200, 280, 370, 190, "#1b6ca8"),
      text(beatId, "a1l", t + 700, model.linkLabel, 220, 220, 14, "#1b6ca8"),
    );
  }

  // Beat 3: second related class
  if (beatOrder === 3) {
    cmds.push(
      ...classBox(beatId, "c2", t, 560, 280, childB.name, childB.rows),
      arrow(beatId, "a2", t + 500, 600, 280, 470, 190, "#1b6ca8"),
      text(beatId, "a2l", t + 700, model.linkLabelB, 500, 220, 14, "#1b6ca8"),
    );
  }

  // Beat 4+: relationship summary grounded in this domain (above footer band)
  if (beatOrder >= 4) {
    cmds.push(
      rect(beatId, "rel", t, 80, 430, 740, 70, "#2a7a5c"),
      text(
        beatId,
        "rel-t",
        t + 200,
        model.summary,
        110,
        452,
        17,
        "#1a2b3c",
      ),
      strokeCheck(beatId, "ok", t + 350, 100, 460),
    );
  }

  return cmds;
}

function umlSequenceCommands(input: TopicDiagramInput): DrawCommand[] {
  const { beatOrder, beatId, t0Base: t } = input;
  const model = inferDomainModel(input.prompt, input.narration, input.highlight);
  const cmds: DrawCommand[] = [];
  const actors = model.actors;

  if (beatOrder <= 1) {
    cmds.push(
      text(
        beatId,
        "title",
        t,
        `${model.domain} · sequence diagram`,
        80,
        36,
        22,
      ),
    );
    for (const a of actors.slice(0, 3)) {
      cmds.push(
        rect(beatId, `box-${a.id}`, t + 150, a.x - 40, 70, 80, 36, "#1a2b3c"),
        text(beatId, `lbl-${a.id}`, t + 250, a.label, a.x - 22, 80, 15),
        line(beatId, `life-${a.id}`, t + 350, a.x, 110, a.x, 420, "#6a7d90", 1.5),
      );
    }
  }

  if (beatOrder === 2) {
    const a0 = actors[0]!;
    const a1 = actors[1]!;
    cmds.push(
      arrow(beatId, "m1", t, a0.x, 160, a1.x, 160, "#1b6ca8"),
      text(beatId, "m1t", t + 200, model.messages[0]!, a0.x + 24, 140, 14, "#1b6ca8"),
    );
  }

  if (beatOrder === 3) {
    const a1 = actors[1]!;
    const a2 = actors[2]!;
    const a3 = actors[3];
    cmds.push(
      arrow(beatId, "m2", t, a1.x, 220, a2.x, 220, "#1b6ca8"),
      text(beatId, "m2t", t + 200, model.messages[1]!, a1.x + 24, 200, 14, "#1b6ca8"),
    );
    if (a3) {
      cmds.push(
        rect(beatId, `box-${a3.id}`, t + 400, a3.x - 40, 70, 80, 36, "#1a2b3c"),
        text(beatId, `lbl-${a3.id}`, t + 500, a3.label, a3.x - 18, 80, 15),
        line(beatId, `life-${a3.id}`, t + 550, a3.x, 110, a3.x, 420, "#6a7d90", 1.5),
      );
    }
  }

  if (beatOrder >= 4) {
    const a0 = actors[0]!;
    const a2 = actors[2]!;
    const a3 = actors[3] ?? a2;
    cmds.push(
      arrow(beatId, "m3", t, a2.x, 280, a3.x, 280, "#1b6ca8"),
      text(beatId, "m3t", t + 150, model.messages[2]!, Math.min(a2.x, a3.x) + 20, 260, 14, "#1b6ca8"),
      arrow(beatId, "m4", t + 400, a3.x, 340, a0.x, 340, "#2a7a5c"),
      text(beatId, "m4t", t + 550, model.messages[3]!, a0.x + 40, 360, 14, "#2a7a5c"),
    );
  }

  return cmds;
}

type DomainClass = { name: string; rows: string[] };
type DomainActor = { id: string; label: string; x: number };

type DomainModel = {
  domain: string;
  classes: [DomainClass, DomainClass, DomainClass];
  linkLabel: string;
  linkLabelB: string;
  summary: string;
  actors: DomainActor[];
  messages: [string, string, string, string];
};

/**
 * Build a domain model from the user prompt / narration — never a fixed Animal demo.
 */
export function inferDomainModel(
  prompt: string,
  narration?: string,
  highlight?: string,
): DomainModel {
  const blob = `${prompt} ${narration ?? ""} ${highlight ?? ""}`.toLowerCase();

  // Curated domains first (high quality labels + methods).
  if (/\batm\b|\bwithdraw|\bdeposit|\bcash\b|\bbank\s*account\b/.test(blob)) {
    return {
      domain: "ATM",
      classes: [
        { name: "Account", rows: ["- balance: Money", "+ withdraw()"] },
        { name: "Customer", rows: ["- cardId: String", "+ authenticate()"] },
        { name: "Transaction", rows: ["- amount: Money", "+ execute()"] },
      ],
      linkLabel: "owns",
      linkLabelB: "records",
      summary: "ATM: Customer → Account → Transaction",
      actors: [
        { id: "user", label: "Customer", x: 120 },
        { id: "atm", label: "ATM", x: 320 },
        { id: "bank", label: "Bank", x: 540 },
        { id: "db", label: "Ledger", x: 760 },
      ],
      messages: ["insertCard()", "withdraw(amt)", "debit()", "cash + receipt"],
    };
  }

  if (/\becommerce\b|\bshop\b|\bcart\b|\border\b|\bcheckout\b/.test(blob)) {
    return {
      domain: "Shop",
      classes: [
        { name: "Order", rows: ["- total: Money", "+ checkout()"] },
        { name: "Customer", rows: ["- email: String", "+ placeOrder()"] },
        { name: "Product", rows: ["- price: Money", "+ reserve()"] },
      ],
      linkLabel: "places",
      linkLabelB: "contains",
      summary: "Shop: Customer → Order → Product",
      actors: [
        { id: "user", label: "Buyer", x: 120 },
        { id: "ui", label: "Cart", x: 320 },
        { id: "api", label: "API", x: 540 },
        { id: "db", label: "DB", x: 760 },
      ],
      messages: ["addItem()", "checkout()", "charge()", "confirm"],
    };
  }

  if (/\bauth\b|\blogin\b|\bsign\s*up\b|\boauth\b|\bsession\b/.test(blob)) {
    return {
      domain: "Auth",
      classes: [
        { name: "User", rows: ["- email: String", "+ login()"] },
        { name: "Session", rows: ["- token: String", "+ validate()"] },
        { name: "AuthService", rows: ["+ authenticate()", "+ logout()"] },
      ],
      linkLabel: "opens",
      linkLabelB: "uses",
      summary: "Auth: User → Session → AuthService",
      actors: [
        { id: "user", label: "User", x: 120 },
        { id: "ui", label: "App", x: 320 },
        { id: "api", label: "Auth", x: 540 },
        { id: "db", label: "Users", x: 760 },
      ],
      messages: ["login()", "verify()", "lookup()", "token"],
    };
  }

  // Extract quoted or TitleCase / PascalCase tokens from text.
  const extracted = extractClassNames(`${prompt} ${narration ?? ""}`);
  if (extracted.length >= 2) {
    const [a, b, c] = [
      extracted[0]!,
      extracted[1]!,
      extracted[2] ?? `${extracted[0]}Service`,
    ];
    return {
      domain: a,
      classes: [
        { name: a, rows: ["- id: String", "+ operate()"] },
        { name: b, rows: ["- id: String", "+ use()"] },
        { name: c, rows: ["- id: String", "+ run()"] },
      ],
      linkLabel: "uses",
      linkLabelB: "links",
      summary: `${a} · ${b} · ${c}`,
      actors: [
        { id: "a0", label: a.slice(0, 8), x: 120 },
        { id: "a1", label: b.slice(0, 8), x: 320 },
        { id: "a2", label: c.slice(0, 8), x: 540 },
        { id: "a3", label: "Store", x: 760 },
      ],
      messages: ["request()", "call()", "save()", "done"],
    };
  }

  // Last resort: derive a domain noun from the prompt (not Animal).
  const domain = guessDomainNoun(prompt) || "System";
  return {
    domain,
    classes: [
      { name: domain, rows: ["- id: String", "+ run()"] },
      { name: "Client", rows: ["- name: String", "+ request()"] },
      { name: "Service", rows: ["+ handle()", "+ respond()"] },
    ],
    linkLabel: "calls",
    linkLabelB: "serves",
    summary: `${domain}: Client → ${domain} → Service`,
    actors: [
      { id: "user", label: "Client", x: 120 },
      { id: "ui", label: domain.slice(0, 8), x: 320 },
      { id: "api", label: "Service", x: 540 },
      { id: "db", label: "Data", x: 760 },
    ],
    messages: ["start()", "process()", "store()", "result"],
  };
}

const STOP = new Set([
  "uml",
  "diagram",
  "class",
  "sequence",
  "code",
  "how",
  "does",
  "work",
  "what",
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "system",
  "design",
  "explain",
  "about",
  "into",
  "using",
]);

function extractClassNames(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  // 'Account', "Customer", or PascalCase tokens
  const re =
    /'([A-Z][A-Za-z0-9]{1,24})'|"([A-Z][A-Za-z0-9]{1,24})"|\b([A-Z][a-z]+[A-Z][A-Za-z0-9]*)\b|\b([A-Z][a-z]{2,16})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = (m[1] || m[2] || m[3] || m[4] || "").trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (STOP.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
    if (out.length >= 4) break;
  }
  return out;
}

function guessDomainNoun(prompt: string): string | null {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  // Prefer concrete nouns near the end (topic) over question words.
  const prefer = [...words].reverse().find((w) => !/^(how|does|work|code)$/.test(w));
  if (!prefer) return null;
  return prefer.charAt(0).toUpperCase() + prefer.slice(1);
}

function processCommands(input: TopicDiagramInput): DrawCommand[] {
  const { beatOrder, beatId, t0Base: t } = input;
  const steps = [
    { label: "Start", x: 80 },
    { label: "Process", x: 300 },
    { label: "Decide", x: 520 },
    { label: "Result", x: 740 },
  ];
  const cmds: DrawCommand[] = [];

  if (beatOrder <= 1) {
    cmds.push(text(beatId, "title", t, "Process flow", 80, 40, 24));
    const s = steps[0]!;
    cmds.push(
      rect(beatId, "s0", t + 200, s.x, 160, 120, 64, "#1a2b3c"),
      text(beatId, "s0t", t + 350, s.label, s.x + 30, 182, 18),
    );
  }

  if (beatOrder >= 2 && beatOrder <= 4) {
    const idx = beatOrder - 1;
    const s = steps[idx];
    const prev = steps[idx - 1];
    if (s && prev) {
      cmds.push(
        arrow(beatId, `a${idx}`, t, prev.x + 120, 192, s.x, 192, "#1b6ca8"),
        rect(beatId, `s${idx}`, t + 250, s.x, 160, 120, 64, "#1a2b3c"),
        text(beatId, `s${idx}t`, t + 400, s.label, s.x + 24, 182, 18),
      );
    }
  }

  if (beatOrder >= 5) {
    cmds.push(
      highlight(beatId, "done", t, 80, 280, 780, 70),
      text(
        beatId,
        "done-t",
        t + 200,
        "Each arrow is time moving forward through the process",
        110,
        304,
        18,
      ),
    );
  }

  return cmds;
}

/* ── tiny command builders ─────────────────────────────────────────── */

function text(
  beatId: string,
  key: string,
  t0: number,
  value: string,
  x: number,
  y: number,
  fontSize: number,
  color = "#1a2b3c",
): DrawCommand {
  return {
    id: `${beatId}-${key}`,
    type: "text",
    t0,
    durationMs: 450,
    text: value.slice(0, 80),
    x,
    y,
    color,
    fontSize,
  };
}

function rect(
  beatId: string,
  key: string,
  t0: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): DrawCommand {
  return {
    id: `${beatId}-${key}`,
    type: "rect",
    t0,
    durationMs: 550,
    x,
    y,
    w,
    h,
    color,
    width: 2.5,
    fill: "rgba(255,255,255,0.92)",
  };
}

function line(
  beatId: string,
  key: string,
  t0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
): DrawCommand {
  return {
    id: `${beatId}-${key}`,
    type: "line",
    t0,
    durationMs: 400,
    x1,
    y1,
    x2,
    y2,
    color,
    width,
  };
}

function arrow(
  beatId: string,
  key: string,
  t0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
): DrawCommand {
  return {
    id: `${beatId}-${key}`,
    type: "arrow",
    t0,
    durationMs: 550,
    x1,
    y1,
    x2,
    y2,
    color,
    width: 2.5,
  };
}

function highlight(
  beatId: string,
  key: string,
  t0: number,
  x: number,
  y: number,
  w: number,
  h: number,
): DrawCommand {
  return {
    id: `${beatId}-${key}`,
    type: "highlight",
    t0,
    durationMs: 400,
    x,
    y,
    w,
    h,
    color: "#f5d76e",
  };
}

function strokeCheck(
  beatId: string,
  key: string,
  t0: number,
  x: number,
  y: number,
): DrawCommand {
  return {
    id: `${beatId}-${key}`,
    type: "stroke",
    t0,
    durationMs: 400,
    color: "#1b6ca8",
    width: 3,
    jitter: 0.6,
    points: [
      { x, y: y + 8 },
      { x: x + 10, y: y + 18 },
      { x: x + 24, y },
    ],
  };
}

function classBox(
  beatId: string,
  key: string,
  t0: number,
  x: number,
  y: number,
  name: string,
  rows: string[],
): DrawCommand[] {
  const h = 44 + rows.length * 22;
  const w = 180;
  const cmds: DrawCommand[] = [
    rect(beatId, `${key}-box`, t0, x, y, w, h, "#1a2b3c"),
    line(beatId, `${key}-div`, t0 + 120, x, y + 32, x + w, y + 32, "#1a2b3c", 1.5),
    text(beatId, `${key}-name`, t0 + 150, name, x + 16, y + 10, 18),
  ];
  rows.forEach((row, i) => {
    cmds.push(
      text(beatId, `${key}-r${i}`, t0 + 250 + i * 80, row, x + 14, y + 42 + i * 22, 14, "#4a6580"),
    );
  });
  return cmds;
}
