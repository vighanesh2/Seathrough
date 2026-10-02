import { writeFileSync } from "node:fs";
import { parseIntakeAnswers } from "../src/lib/experiment/systemDesign/answers";
import { parseSystemDesignSpec } from "../src/lib/experiment/systemDesign/spec";
import { parseSavedDesignSession } from "../src/lib/experiment/systemDesign/session";
import { SYSTEM_DESIGN_SECTION_IDS } from "../src/lib/experiment/systemDesign/sections";

const sections = SYSTEM_DESIGN_SECTION_IDS.map((id) => ({
  id,
  say: `${id} for a chat app.`,
}));
const spec = parseSystemDesignSpec({
  title: "Chat app",
  stack: { cloud: "AWS", database: "RDS Postgres", compute: "Lambda", auth: "Cognito" },
  sections,
  boxes: [
    { id: "web", label: "Web Client", column: "client" },
    { id: "api", label: "API Gateway", column: "edge" },
    { id: "fn", label: "Lambda", column: "service" },
    { id: "db", label: "RDS Postgres", column: "data" },
  ],
  arrows: [
    { from: "web", to: "api", label: "HTTPS" },
    { from: "api", to: "fn", label: "Invoke" },
    { from: "fn", to: "db", label: "SQL" },
  ],
  tables: [{ id: "users", name: "Users", fields: ["id", "email"], store: "db" }],
  flow: [{ from: "web", to: "api", label: "send" }],
  points: {
    scaling: [{ target: "fn", label: "Autoscale" }],
    reliability: [{ target: "db", label: "Primary fails", then: "Failover" }],
    security: [{ target: "api", label: "JWT" }],
    observability: [{ target: "fn", label: "p95" }],
  },
  deployment: [{ id: "vpc", label: "One region", members: ["api", "fn", "db"] }],
});
const answers = parseIntakeAnswers({
  who: "Friends sending messages",
  scale: "A few thousand online",
  dayOne: "Realtime text",
  constraint: "Messages stay in order",
});
if (!answers.ok) throw new Error("answers");
const parsed = parseSavedDesignSession({
  version: 1,
  prompt: "system design of a chat app",
  answers: answers.answers,
  spec,
  edits: ["use AWS"],
  messages: [
    { id: "m1", role: "user", text: "system design of a chat app", afterBeat: -1 },
    { id: "m2", role: "user", text: "add image attachments", afterBeat: 3 },
    { id: "m3", role: "tutor", text: "Added S3 for image attachments.", afterBeat: 3 },
  ],
});
if (!parsed.ok) throw new Error(parsed.error);
writeFileSync("/tmp/sd-session.json", JSON.stringify(parsed.session));
console.log("wrote", parsed.session.messages.length, "messages");
