import { formatIntakeAnswers } from "@/lib/experiment/systemDesign/answers";
import { compileSystemDesign } from "@/lib/experiment/systemDesign/compile";
import { completeDesignJson } from "@/lib/experiment/systemDesign/llm";
import type { IntakeAnswers } from "@/lib/experiment/systemDesign/sections";
import { sectionLabel } from "@/lib/experiment/systemDesign/sections";
import {
  applyDesignRepair,
  designGaps,
  needsCdnWaf,
  parseSystemDesignSpec,
  structureGaps,
  type SystemDesignSpec,
} from "@/lib/experiment/systemDesign/spec";
import type { ExperimentLesson } from "@/lib/experiment/scene";

/** The JSON shape shared by generation and revision prompts. */
export const SPEC_SCHEMA = `{
  "title": "short title",
  "stack": { "cloud": "", "compute": "", "database": "", "cache": "", "queue": "", "realtime": "", "auth": "", "storage": "", "cdn": "", "observability": "" },
  "sections": [
    { "id": "requirements|architecture|data-model|flows|scaling|reliability|security|observability|deployment",
      "say": "2-4 sentences: the decision and the tradeoff",
      "example": "the concrete artifact" }
  ],
  "boxes": [ { "id": "kebab-id", "label": "short name", "column": "client|edge|service|data" } ],
  "arrows": [ { "from": "box id", "to": "box id", "label": "short" } ],
  "tables": [ { "id": "kebab-id", "name": "Users", "fields": ["id", "email"], "store": "box id" } ],
  "flow": [ { "from": "box id", "to": "box id", "label": "send message" } ],
  "points": {
    "scaling": [ { "target": "box id", "label": "how it scales", "then": "optional result" } ],
    "reliability": [ { "target": "box id", "label": "what fails", "then": "what recovers it" } ],
    "security": [ { "target": "box id", "label": "the control" } ],
    "observability": [ { "target": "box id", "label": "signal you measure" } ]
  },
  "deployment": [ { "id": "kebab-id", "label": "e.g. Public subnet", "members": ["box id"] } ]
}`;

const SYSTEM = `You design a software system for a student looking at a whiteboard.
Use the student's answers. State those assumptions in Requirements.
Return ONLY JSON:
${SPEC_SCHEMA}

Rules:
- stack names the concrete product for each concern (e.g. "PostgreSQL on RDS", "Supabase Auth", "Redis"). Leave a key out when it does not apply. If the student names a provider, use it everywhere.
- Every diagram is drawn from boxes, arrows, tables, flow, points, and deployment, so name the same products there and in the section text.
- Include every section id exactly once, in that order.
- example is required for architecture (the request path), data-model (tables), and flows (one request from send to delivery).
- boxes: 4-10 real components. client = apps and users, edge = CDN, WAF, load balancer, gateway, service = your services, data = stores, caches, queues. Labels under 22 characters and name the product, e.g. "RDS Postgres", never only the cloud ("AWS"). Never label a box N/A, none, or not applicable.
- arrows, flow, points.target, tables.store, and deployment.members only use box ids.
- tables: 2-5 main tables with their key fields.
- flow: 3-8 ordered steps of the most important request.
- points: 1-3 per section.
- deployment: 1-4 groups (regions, subnets, or platforms) that hold the boxes that run there.
No photos. JSON only.`;

async function repairSpec(spec: SystemDesignSpec, brief: string): Promise<SystemDesignSpec> {
  const text = designGaps(spec);
  const structure = structureGaps(spec);
  if (!text.length && !structure.length) return spec;
  const asks: string[] = [];
  if (text.length) {
    asks.push(
      `Sections missing text: ${text.map(sectionLabel).join(", ")}. Each needs say; architecture, data-model, and flows also need example.`,
    );
  }
  if (structure.length) {
    asks.push(
      `Diagrams with nothing to draw: ${structure.map(sectionLabel).join(", ")}. Fill boxes/arrows, tables, flow, points, or deployment for those.`,
    );
  }
  const repaired = await completeDesignJson(
    SYSTEM,
    `Fill ONLY what is missing in this design. Keep the same product and the same box ids.\n${asks.join("\n")}\n\nCurrent design:\n${JSON.stringify(spec)}\n\nProduct:\n${brief}`,
    { maxTokens: 3000 },
  );
  return applyDesignRepair(spec, repaired);
}

export async function generateSystemDesign(
  prompt: string,
  answers: IntakeAnswers,
): Promise<{ spec: SystemDesignSpec; lesson: ExperimentLesson }> {
  const front = needsCdnWaf(answers.scale)
    ? "This audience is large or public: put a CDN / WAF and a load balancer in front."
    : "This audience is small: a load balancer in front is enough, no CDN.";
  const brief = `${prompt.trim()}\n\nStudent answers:\n${formatIntakeAnswers(answers)}\n\n${front}`;
  const first = parseSystemDesignSpec(
    await completeDesignJson(SYSTEM, `Design this system:\n${brief}`, { maxTokens: 5000 }),
  );
  const spec = await repairSpec(first, brief);
  const gaps = designGaps(spec);
  if (gaps.length) {
    throw new Error(
      `System design is missing ${gaps.map(sectionLabel).join(", ")}.`,
    );
  }
  return { spec, lesson: await compileSystemDesign(spec, prompt.trim()) };
}
