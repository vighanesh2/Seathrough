import { z } from "zod";

/** Stable slug for a topic or catalog construction. */
export const topicIdSchema = z
  .string()
  .min(2)
  .max(64)
  .regex(
    /^[a-z][a-z0-9-]*$/,
    "topic id must be a lowercase slug (a-z, 0-9, hyphen)",
  );

export type TopicId = z.infer<typeof topicIdSchema>;

/** Several topics can share one interactive board with different parameters. */
export const topicBoardIdSchema = z.enum([
  "secant-tangent",
  "ode-solution",
  /** Runs a curated construction from the JSXGraph example catalog. */
  "construction",
  /** Plots y = f(x) from a safe expression parsed out of the question. */
  "function-graph",
]);

export type TopicBoardId = z.infer<typeof topicBoardIdSchema>;

const boardPointSchema = z.tuple([z.number().finite(), z.number().finite()]);

export type BoardPoint = z.infer<typeof boardPointSchema>;

/** JSXGraph bounding box: [left, top, right, bottom]. */
export const boundingBoxSchema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);

export type BoundingBox = z.infer<typeof boundingBoxSchema>;

export const secantTangentBoardParamsSchema = z.object({
  boardKind: z.literal("secant-tangent"),
  boundingBox: boundingBoxSchema,
  /**
   * Control points for the curve. `points[0]` and `points[1]` are the interval
   * endpoints a and b; the rest only bend the curve between them.
   */
  points: z.array(boardPointSchema).min(3).max(8),
  labels: z.object({
    a: z.string().min(1).max(12),
    b: z.string().min(1).max(12),
    c: z.string().min(1).max(12),
  }),
  /** Rolle's case: f(a) = f(b), so the secant is horizontal. */
  flatSecant: z.boolean().optional(),
});

export type SecantTangentBoardParams = z.infer<
  typeof secantTangentBoardParamsSchema
>;

/** Parameters for plotting an ODE solution y' = f(t, y). */
export const odeSolutionBoardParamsSchema = z.object({
  boardKind: z.literal("ode-solution"),
  boundingBox: boundingBoxSchema,
  /**
   * Right-hand side as a JessieCode snippet in variables t, y, and c
   * (e.g. "(2-t)*y + c").
   */
  odeExpression: z.string().min(1).max(120),
  initialT: z.number().finite(),
  initialY: z.number().finite(),
  /** Starting value for the parameter slider c. */
  parameterC: z.number().finite(),
  /** Integrate from t₀ to t₀ + timeSpan. */
  timeSpan: z.number().finite(),
  parameterMin: z.number().finite(),
  parameterMax: z.number().finite(),
  timeSpanMin: z.number().finite(),
  timeSpanMax: z.number().finite(),
});

export type OdeSolutionBoardParams = z.infer<typeof odeSolutionBoardParamsSchema>;

/**
 * Look up a curated construction by id on the client.
 * Executable source never travels through VisualPlan / the database.
 */
export const constructionBoardParamsSchema = z.object({
  boardKind: z.literal("construction"),
  boundingBox: boundingBoxSchema,
  constructionId: topicIdSchema,
  keepAspectRatio: z.boolean().optional(),
});

export type ConstructionBoardParams = z.infer<
  typeof constructionBoardParamsSchema
>;

/** Parameters for plotting an arbitrary (safe) y = f(x). */
export const functionGraphBoardParamsSchema = z.object({
  boardKind: z.literal("function-graph"),
  boundingBox: boundingBoxSchema,
  /** JessieCode expression in x, e.g. "x^4" or "sin(x)+x". */
  expression: z.string().min(1).max(80),
  showTangent: z.boolean().default(true),
  /** Second glider plus a labeled secant through two points on the curve. */
  showSecant: z.boolean().optional(),
  /** Overrides the default `y = <expression>` caption. */
  caption: z.string().max(80).optional(),
  xMin: z.number().finite(),
  xMax: z.number().finite(),
});

export type FunctionGraphBoardParams = z.infer<
  typeof functionGraphBoardParamsSchema
>;

export const topicBoardParamsSchema = z.discriminatedUnion("boardKind", [
  secantTangentBoardParamsSchema,
  odeSolutionBoardParamsSchema,
  constructionBoardParamsSchema,
  functionGraphBoardParamsSchema,
]);

export type TopicBoardParams = z.infer<typeof topicBoardParamsSchema>;
