import { getCatalogEntry } from "@/lib/topics/catalog";
import type { ConstructionBoardParams } from "@/lib/topics/schema";
import type { TopicBoardContext } from "@/components/topics/boards/types";

function asConstructionParams(
  params: TopicBoardContext["params"],
): ConstructionBoardParams | null {
  return params.boardKind === "construction" ? params : null;
}

/**
 * Run a curated construction from the local catalog.
 *
 * Source is never fetched from the network — only from the ingested catalog.
 * Bodies are checked at ingest time for forbidden APIs (initBoard, eval, …).
 */
export function drawConstruction(ctx: TopicBoardContext): void {
  const params = asConstructionParams(ctx.params);
  if (!params) return;

  const entry = getCatalogEntry(params.constructionId);
  if (!entry) {
    console.warn(
      `[topics] unknown construction id: ${params.constructionId}`,
    );
    return;
  }

  const { JXG, board } = ctx;

  try {
    // Local curated source only. Ingest forbids eval/fetch/require/etc.
    const run = new Function("JXG", "board", entry.source);
    run(JXG, board);
  } catch (error) {
    console.error(
      `[topics] construction "${entry.id}" failed`,
      error instanceof Error ? error.message : error,
    );
  }
}
