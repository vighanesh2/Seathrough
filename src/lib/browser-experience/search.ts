import { getTavilyConfig } from "@/lib/env";
import type { LessonSource } from "@/types/lesson";

const SEARCH_TIMEOUT_MS = 8_000;
const MAX_RESULTS = 6;

/** Domains that are great for student-facing explanations. */
const PREFERRED_DOMAINS = [
  "britannica.com",
  "openstax.org",
  "nasa.gov",
  "noaa.gov",
  "cdc.gov",
  "nhlbi.nih.gov",
  "ninds.nih.gov",
  "cancer.gov",
  "medlineplus.gov",
  "mayoclinic.org",
  "kidshealth.org",
  "edu",
  "khanacademy.org",
  "nationalgeographic.com",
  "smithsonianmag.com",
  "howstuffworks.com",
  "livescience.com",
  "space.com",
  "bbc.com",
  "bbc.co.uk",
  "wikipedia.org",
  "developer.mozilla.org",
  "react.dev",
  "python.org",
  "typescriptlang.org",
] as const;

/** Research dumps that look "credible" but teach poorly for simple questions. */
const DEPRIORITIZE_HOSTS = [
  "pmc.ncbi.nlm.nih.gov",
  "pubmed.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov/pmc",
  "sciencedirect.com",
  "link.springer.com",
  "onlinelibrary.wiley.com",
  "tandfonline.com",
  "jstor.org",
  "researchgate.net",
  "semanticscholar.org",
] as const;

const BLOCKED = [
  "reddit.com",
  "quora.com",
  "medium.com",
  "substack.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "pinterest.com",
  "fandom.com",
  "youtube.com",
] as const;

type TavilyResult = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  score?: unknown;
};

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function safeUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    url.hostname = url.hostname.replace(/^www\./i, "");
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function hostMatches(hostname: string, domain: string): boolean {
  if (domain === "edu") {
    return (
      hostname.endsWith(".edu") ||
      /\.(?:ac|edu)\.[a-z]{2}$/i.test(hostname)
    );
  }
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function isBlocked(hostname: string): boolean {
  return BLOCKED.some((d) => hostMatches(hostname, d));
}

function scoreSource(url: URL, title: string, excerpt: string): number {
  const host = url.hostname.toLowerCase();
  let score = 1;
  if (PREFERRED_DOMAINS.some((d) => hostMatches(host, d))) score += 5;
  if (host.endsWith(".gov") || host.endsWith(".edu")) score += 3;
  if (DEPRIORITIZE_HOSTS.some((d) => host.includes(d.replace(/^www\./, "")))) {
    score -= 6;
  }
  if (/\/pmc\/articles\//i.test(url.pathname)) score -= 8;
  if (/\b(parts?|anatomy|explained|overview|introduction|basics)\b/i.test(title)) {
    score += 2;
  }
  if (excerpt.length > 120) score += 1;
  // Prefer shorter educational URLs over deep journal paths.
  if (url.pathname.split("/").filter(Boolean).length <= 3) score += 1;
  return score;
}

export async function searchBrowserSources(
  query: string,
  signal?: AbortSignal,
): Promise<LessonSource[]> {
  const apiKey = getTavilyConfig().apiKey;
  const trimmed = query.trim().slice(0, 400);
  if (!apiKey || !trimmed) return [];

  const timeout = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeout])
    : timeout;

  const wantsVisual =
    /\b(diagram|figure|picture|image|parts?|anatomy|labeled|labelled|lobes?)\b/i.test(
      trimmed,
    );
  // Learner-focused query — NOT "peer-reviewed research" (that pulls PMC papers).
  const searchQuery = wantsVisual
    ? `${trimmed} labeled diagram parts explained for students`
    : `${trimmed} explained for students overview`;

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: searchQuery,
      topic: "general",
      search_depth: "advanced",
      chunks_per_source: 2,
      max_results: 14,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      exclude_domains: [
        ...BLOCKED,
        "pmc.ncbi.nlm.nih.gov",
        "pubmed.ncbi.nlm.nih.gov",
        "researchgate.net",
      ],
    }),
    signal: combinedSignal,
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed with status ${response.status}`);
  }

  const json = (await response.json()) as { results?: TavilyResult[] };
  const ranked: Array<LessonSource & { score: number }> = [];
  const seen = new Set<string>();

  for (const raw of json.results ?? []) {
    const url = safeUrl(raw?.url);
    const title = cleanText(raw?.title, 240);
    const excerpt = cleanText(raw?.content, 800);
    if (!url || url.protocol !== "https:" || !title || !excerpt) continue;
    if (isBlocked(url.hostname.toLowerCase())) continue;
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    ranked.push({
      id: "tmp",
      title,
      url: url.href,
      publisher: url.hostname.replace(/^www\./, ""),
      excerpt,
      score: scoreSource(url, title, excerpt),
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, MAX_RESULTS).map((item, index) => ({
    id: `S${index + 1}`,
    title: item.title,
    url: item.url,
    publisher: item.publisher,
    excerpt: item.excerpt,
  }));
}
