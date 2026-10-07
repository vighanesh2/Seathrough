import type { Page } from "playwright-core";
import { getTavilyConfig } from "@/lib/env";
import type { LessonSource } from "@/types/lesson";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const YOUTUBE_ASK =
  /\b(youtube|yt\b|video|watch|clip|lecture recording|ted talk)\b/i;

const TRUSTED_CHANNEL_HINTS = [
  "khan academy",
  "crash course",
  "amoeba sisters",
  "ted-ed",
  "ted ed",
  "national geographic",
  "bozeman",
  "mit opencourseware",
  "kurzgesagt",
  "veritasium",
  "scishow",
  "free school",
  "nucleus medical",
  "osmosis",
  "crashcourse",
];

export function wantsYouTube(question: string): boolean {
  return YOUTUBE_ASK.test(question);
}

export function isYouTubeWatchUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") return u.pathname.length > 1;
    if (host === "youtube.com" || host === "m.youtube.com") {
      return u.pathname === "/watch" && u.searchParams.has("v");
    }
    return false;
  } catch {
    return false;
  }
}

export function isYouTubeEmbedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    return (
      (host === "youtube.com" ||
        host === "youtube-nocookie.com" ||
        host === "m.youtube.com") &&
      u.pathname.startsWith("/embed/")
    );
  } catch {
    return false;
  }
}

export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      return u.pathname.replace(/^\//, "").slice(0, 20) || null;
    }
    if (host.includes("youtube")) {
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/")[2]?.slice(0, 20) || null;
      }
      return u.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

export function watchUrlForId(id: string, seconds = 0): string {
  const t = Math.max(0, Math.floor(seconds));
  const base = `https://www.youtube.com/watch?v=${id}`;
  return t > 0 ? `${base}&t=${t}s` : base;
}

export function embedUrlForId(id: string, seconds = 0): string {
  const t = Math.max(0, Math.floor(seconds));
  const url = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
  url.searchParams.set("enablejsapi", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("autoplay", "1");
  if (t > 0) url.searchParams.set("start", String(t));
  return url.href;
}

export function watchUrlWithTime(url: string, seconds: number): string {
  const id = extractYouTubeId(url);
  if (!id) return url;
  if (isYouTubeEmbedUrl(url)) return embedUrlForId(id, seconds);
  return watchUrlForId(id, seconds);
}

type TavilyResult = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
};

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function educationalBoost(title: string, excerpt: string): number {
  const hay = `${title} ${excerpt}`.toLowerCase();
  let boost = 0;
  for (const hint of TRUSTED_CHANNEL_HINTS) {
    if (hay.includes(hint)) boost += 25;
  }
  if (/\b(explained|crash course|lecture|science|biology|physics|chemistry)\b/i.test(hay)) {
    boost += 8;
  }
  // Prefer shorter educational clips over multi-hour "full chapter" dumps.
  if (/\b(full chapter|complete course|playlist|10 hours|hour long)\b/i.test(hay)) {
    boost -= 15;
  }
  return boost;
}

/** Search specifically for educational YouTube videos. */
export async function searchYouTubeSources(
  query: string,
  signal?: AbortSignal,
): Promise<LessonSource[]> {
  const apiKey = getTavilyConfig().apiKey;
  const trimmed = query
    .replace(/\b(youtube|yt|video|watch)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  if (!apiKey || !trimmed) return [];

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `${trimmed} explained site:youtube.com (Khan Academy OR Crash Course OR Amoeba Sisters OR TED-Ed OR Bozeman)`,
      topic: "general",
      search_depth: "advanced",
      max_results: 12,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
    }),
    signal: signal ?? AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed with status ${response.status}`);
  }

  const json = (await response.json()) as { results?: TavilyResult[] };
  const scored: Array<LessonSource & { rank: number }> = [];
  const seen = new Set<string>();

  for (const raw of json.results ?? []) {
    const urlRaw = typeof raw.url === "string" ? raw.url : "";
    if (!isYouTubeWatchUrl(urlRaw) && !isYouTubeEmbedUrl(urlRaw)) continue;
    const id = extractYouTubeId(urlRaw);
    if (!id || seen.has(id)) continue;
    const title = cleanText(raw.title, 240);
    const excerpt = cleanText(raw.content, 800);
    if (!title) continue;
    seen.add(id);
    scored.push({
      id: `Y${scored.length + 1}`,
      title,
      url: watchUrlForId(id),
      publisher: "youtube.com",
      excerpt: excerpt || title,
      rank: educationalBoost(title, excerpt),
    });
  }

  scored.sort((a, b) => b.rank - a.rank);
  return scored.slice(0, 6).map(({ rank: _rank, ...source }) => source);
}

async function dismissYouTubeOverlays(page: Page): Promise<void> {
  const selectors = [
    "button:has-text('Accept all')",
    "button:has-text('Accept the use of cookies')",
    "button:has-text('I agree')",
    "button:has-text('Reject all')",
    "button:has-text('No thanks')",
    "tp-yt-paper-button:has-text('Accept all')",
    "[aria-label='Accept the use of cookies and other data for the purposes described']",
  ];
  for (const selector of selectors) {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 700 }).catch(() => false)) {
      await btn.click({ timeout: 2000 }).catch(() => undefined);
      await delay(400);
    }
  }
}

export async function youtubePlayerError(
  page: Page,
): Promise<string | null> {
  return page.evaluate(() => {
    const errorRoot = document.querySelector(
      ".ytp-error, .ytp-error-content, #player-error-message-container, .player-unavailable",
    );
    const text = (errorRoot?.textContent || "").replace(/\s+/g, " ").trim();
    if (/something went wrong|error|unavailable|not available|copyright|sign in to confirm/i.test(text)) {
      return text.slice(0, 200) || "player_error";
    }
    const body = (document.body?.innerText || "").slice(0, 1200);
    if (/something went wrong\.?\s*refresh or try again/i.test(body)) {
      return "Something went wrong";
    }
    return null;
  });
}

export async function youtubeHasPlayableMedia(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const video = document.querySelector("video");
    if (!video) return false;
    const ready = video.readyState >= 2 || video.duration > 0 || !video.paused;
    const rect = video.getBoundingClientRect();
    return ready && rect.width > 40 && rect.height > 40;
  });
}

/**
 * Open a watch page, recover from common player failures, then fall back to
 * the privacy-enhanced embed which is more reliable under automation.
 */
export async function openYouTubeLesson(
  page: Page,
  watchUrl: string,
): Promise<{
  ok: boolean;
  mode: "watch" | "embed";
  url: string;
  reason?: string;
}> {
  const id = extractYouTubeId(watchUrl);
  if (!id) return { ok: false, mode: "watch", url: watchUrl, reason: "bad_id" };

  // 1) Prefer the normal watch page (looks like a real browser lesson).
  try {
    await page.goto(watchUrlForId(id), {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await delay(1200);
    await dismissYouTubeOverlays(page);

    let err = await youtubePlayerError(page);
    if (err) {
      await page.reload({ waitUntil: "domcontentloaded", timeout: 45_000 }).catch(
        () => undefined,
      );
      await delay(1500);
      await dismissYouTubeOverlays(page);
      err = await youtubePlayerError(page);
    }

    if (!err) {
      await youtubePlay(page);
      await delay(900);
      if (!(await youtubePlayerError(page)) && (await youtubeHasPlayableMedia(page))) {
        return { ok: true, mode: "watch", url: page.url() };
      }
    }
  } catch {
    /* fall through to embed */
  }

  // 2) Embed fallback — often works when the watch player is blocked.
  const embed = embedUrlForId(id);
  try {
    await page.goto(embed, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await delay(1400);
    await dismissYouTubeOverlays(page);
    await youtubePlay(page);
    await delay(1000);

    if (await youtubePlayerError(page)) {
      return {
        ok: false,
        mode: "embed",
        url: embed,
        reason: "embed_player_error",
      };
    }
    if (!(await youtubeHasPlayableMedia(page))) {
      // One more play nudge — embeds sometimes need a second click.
      await youtubePlay(page);
      await delay(900);
    }
    if (await youtubeHasPlayableMedia(page)) {
      return { ok: true, mode: "embed", url: page.url() };
    }
    return {
      ok: false,
      mode: "embed",
      url: embed,
      reason: "no_playable_media",
    };
  } catch (error) {
    return {
      ok: false,
      mode: "embed",
      url: embed,
      reason: error instanceof Error ? error.message : "embed_failed",
    };
  }
}

export async function youtubePlay(page: Page): Promise<{ ok: boolean; reason?: string }> {
  try {
    await dismissYouTubeOverlays(page);

    const playBtn = page.locator(
      [
        "button.ytp-large-play-button",
        "button.ytp-play-button[data-title-no-tooltip='Play']",
        "button.ytp-play-button[aria-label^='Play']",
        ".ytp-cued-thumbnail-overlay-image",
        "button[aria-label='Play']",
      ].join(", "),
    );
    if (await playBtn.first().isVisible({ timeout: 1800 }).catch(() => false)) {
      await playBtn.first().click({ timeout: 3000 }).catch(() => undefined);
    }

    await page.evaluate(async () => {
      const video = document.querySelector("video");
      if (!video) return;
      try {
        video.muted = true; // muted autoplay is allowed in headless/cloud browsers
        await video.play();
      } catch {
        /* click path above is the main gesture */
      }
    });

    await page.locator("video").first().waitFor({ state: "attached", timeout: 8000 });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "play_failed",
    };
  }
}

export async function youtubePause(page: Page): Promise<{ ok: boolean; reason?: string }> {
  try {
    await page.evaluate(() => {
      const video = document.querySelector("video");
      if (video) video.pause();
    });
    const pauseBtn = page.locator(
      "button.ytp-play-button[data-title-no-tooltip='Pause'], button.ytp-play-button[aria-label^='Pause']",
    );
    if (await pauseBtn.first().isVisible({ timeout: 800 }).catch(() => false)) {
      await pauseBtn.first().click({ timeout: 1500 }).catch(() => undefined);
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "pause_failed",
    };
  }
}

export async function youtubeSeek(
  page: Page,
  seconds: number,
): Promise<{ ok: boolean; reason?: string; mode?: string }> {
  const t = Math.max(0, Math.floor(seconds));
  try {
    const sought = await page.evaluate(async (time) => {
      const video = document.querySelector("video");
      if (!video) return false;
      video.pause();
      try {
        video.currentTime = time;
      } catch {
        return false;
      }
      await new Promise((r) => setTimeout(r, 280));
      video.pause();
      return true;
    }, t);

    if (sought) {
      await youtubePause(page);
      return { ok: true, mode: "youtube_seek" };
    }

    const current = page.url();
    const id = extractYouTubeId(current);
    if (!id) return { ok: false, reason: "no_video_id" };
    const next = isYouTubeEmbedUrl(current)
      ? embedUrlForId(id, t)
      : watchUrlForId(id, t);
    await page.goto(next, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await delay(1200);
    await youtubePlay(page);
    await delay(700);
    await youtubePause(page);
    return { ok: true, mode: "youtube_seek_nav" };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "seek_failed",
    };
  }
}

export async function extractYouTubeMeta(page: Page): Promise<{
  title: string;
  url: string;
  durationSec: number | null;
}> {
  return page.evaluate(() => {
    const title =
      document
        .querySelector(
          "h1.ytd-watch-metadata yt-formatted-string, h1 yt-formatted-string, h1, .ytp-title-link",
        )
        ?.textContent?.trim() ||
      document.title.replace(/ - YouTube$/i, "").trim() ||
      "";
    const video = document.querySelector("video");
    const durationSec =
      video && Number.isFinite(video.duration) && video.duration > 0
        ? Math.floor(video.duration)
        : null;
    return { title, url: location.href, durationSec };
  });
}
