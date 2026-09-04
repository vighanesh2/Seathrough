import catalogJson from "@/lib/topics/catalog/generated/catalog.json";
import {
  catalogFileSchema,
  type CatalogEntry,
} from "@/lib/topics/catalog/types";
import type { TopicModule } from "@/lib/topics/types";

const parsed = catalogFileSchema.parse(catalogJson);

export const CATALOG_ENTRIES: readonly CatalogEntry[] = parsed.entries;

const BY_ID = new Map(CATALOG_ENTRIES.map((e) => [e.id, e]));

export function getCatalogEntry(id: string | null | undefined): CatalogEntry | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

export function listCatalogEntries(): readonly CatalogEntry[] {
  return CATALOG_ENTRIES;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Alias / tag hit for a catalog construction. */
export function catalogEntryMatches(
  entry: CatalogEntry,
  prompt: string,
  conceptKey?: string,
): boolean {
  const blob = normalize(`${prompt} ${conceptKey ?? ""}`);
  if (!blob) return false;

  for (const alias of entry.aliases) {
    const a = normalize(alias);
    if (a && blob.includes(a)) return true;
  }
  // Multi-word tags: require the whole tag phrase
  for (const tag of entry.tags) {
    const t = normalize(tag);
    if (t.includes(" ") && blob.includes(t)) return true;
  }
  return false;
}

/** Turn catalog data into the same TopicModule shape as hand-written topics. */
export function catalogEntryToModule(entry: CatalogEntry): TopicModule {
  const params = {
    boardKind: "construction" as const,
    boundingBox: entry.boundingBox,
    constructionId: entry.id,
    keepAspectRatio: entry.keepAspectRatio,
  };

  return {
    id: entry.id,
    boardId: "construction",
    title: entry.title,
    summary: entry.summary,
    formula: entry.formula,
    aliases: [...entry.aliases],
    steps: entry.steps.map((s) => ({ title: s.title, detail: s.detail })),
    defaultParams: params,
    deriveParams: () => params,
    matches: (prompt, conceptKey) =>
      catalogEntryMatches(entry, prompt, conceptKey),
  };
}

export function catalogTopicModules(): TopicModule[] {
  return CATALOG_ENTRIES.map(catalogEntryToModule);
}
