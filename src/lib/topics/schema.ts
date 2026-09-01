import { z } from "zod";

/**
 * Wire format for the interactive topic library.
 *
 * Kept free of app imports so `@/lib/visuals/types` can depend on it without a
 * cycle, and so every value here survives a round trip through the visual
 * library cache as plain JSON. Drawing code is looked up by `boardId` on the
 * client — the database never stores anything executable.
 */

export const topicIdSchema = z.enum([
  "mean-value-theorem",
  "rolles-theorem",
  "differential-equations",
]);

export type TopicId = z.infer<typeof topicIdSchema>;

/** Several topics can share one interactive board with different parameters. */
export const topicBoardIdSchema = z.enum(["secant-tangent", "ode-solution"]);

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

export const topicBoardParamsSchema = z.discriminatedUnion("boardKind", [
  secantTangentBoardParamsSchema,
  odeSolutionBoardParamsSchema,
]);

export type TopicBoardParams = z.infer<typeof topicBoardParamsSchema>;
