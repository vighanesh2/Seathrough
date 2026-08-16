import { ANATOMY_SOURCES } from "@/lib/anatomy/registry";
import type {
  AnatomyCitation,
  AnatomyStructureId,
} from "@/lib/anatomy/types";

export type AnatomyKnowledgeEntry = {
  id: string;
  title: string;
  keywords: string[];
  structureIds: AnatomyStructureId[];
  sourceKey: keyof typeof ANATOMY_SOURCES;
  excerpt: string;
};

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export function retrieveKnowledge(
  catalog: AnatomyKnowledgeEntry[],
  question: string,
  selectedStructure?: AnatomyStructureId | null,
  limit = 4,
): AnatomyKnowledgeEntry[] {
  const tokens = new Set(tokenize(question));
  if (!tokens.size && !selectedStructure) return [];

  return catalog
    .map((entry) => {
      let score = 0;
      for (const keyword of entry.keywords) {
        const keywordTokens = tokenize(keyword);
        if (keywordTokens.every((token) => tokens.has(token))) {
          score += keywordTokens.length === 1 ? 2 : 4;
        }
      }
      if (
        selectedStructure &&
        entry.structureIds.includes(selectedStructure)
      ) {
        score += 3;
      }
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, Math.max(1, limit))
    .map(({ entry }) => entry);
}

export function citationsForKnowledge(
  entries: AnatomyKnowledgeEntry[],
): AnatomyCitation[] {
  const seen = new Set<string>();
  const citations: AnatomyCitation[] = [];
  for (const entry of entries) {
    const source = ANATOMY_SOURCES[entry.sourceKey];
    if (seen.has(source.id)) continue;
    seen.add(source.id);
    citations.push({ ...source, excerpt: entry.excerpt });
  }
  return citations;
}
