import { z } from "zod";

export const MAX_GENERATED_SVG_CHARS = 80_000;

export const generatedSvgEnvelopeSchema = z
  .object({
    title: z.string().trim().min(3).max(120),
    alt: z.string().trim().min(12).max(320),
    svg: z.string().min(80).max(MAX_GENERATED_SVG_CHARS),
  })
  .strict();

export type GeneratedSvgEnvelope = z.infer<typeof generatedSvgEnvelopeSchema>;

const diagramIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[a-z][a-z0-9-]*$/);

export const semanticDiagramSchema = z
  .object({
    title: z.string().trim().min(3).max(52),
    kind: z.enum([
      "relationship",
      "process",
      "timeline",
      "hierarchy",
      "comparison",
      "cycle",
    ]),
    takeaway: z.string().trim().min(3).max(88),
    nodes: z
      .array(
        z
          .object({
            id: diagramIdSchema,
            label: z.string().trim().min(1).max(28),
            detail: z.string().trim().min(1).max(38),
            role: z.enum(["primary", "supporting", "outcome"]),
          })
          .strict(),
      )
      .min(3)
      .max(6),
    edges: z
      .array(
        z
          .object({
            from: diagramIdSchema,
            to: diagramIdSchema,
            label: z.string().trim().max(26).optional(),
          })
          .strict(),
      )
      .min(2)
      .max(12),
  })
  .strict()
  .superRefine((diagram, ctx) => {
    if (
      ["process", "timeline", "comparison"].includes(diagram.kind) &&
      diagram.nodes.length > 4
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["nodes"],
        message: `${diagram.kind} diagrams support at most four readable stages`,
      });
    }
    const ids = new Set<string>();
    for (const [index, node] of diagram.nodes.entries()) {
      if (ids.has(node.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["nodes", index, "id"],
          message: "Node IDs must be unique",
        });
      }
      ids.add(node.id);
    }
    for (const [index, edge] of diagram.edges.entries()) {
      if (!ids.has(edge.from) || !ids.has(edge.to)) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index],
          message: "Every edge endpoint must reference a node",
        });
      }
      if (edge.from === edge.to) {
        ctx.addIssue({
          code: "custom",
          path: ["edges", index],
          message: "Self-referencing edges are not allowed",
        });
      }
    }
  });

export type SemanticDiagram = z.infer<typeof semanticDiagramSchema>;
