import {
  extractPageText,
  gotoSafe,
  type PageExtraction,
  waitForStablePage,
} from "@/lib/browser-experience/driver";
import { openLiveBrowser } from "@/lib/browser-experience/openBrowser";
import { searchBrowserSources } from "@/lib/browser-experience/search";
import {
  createSessionRecord,
  destroySession,
  gcStaleSessions,
  requireSession,
  sessionPage,
  toPublicSession,
  touchSession,
  type BrowserSessionRecord,
} from "@/lib/browser-experience/sessionStore";
import { beatsFromPlan, planBrowserLesson } from "@/lib/browser-experience/teach";
import type {
  BrowserStreamEvent,
  BrowserTeachBeat,
} from "@/lib/browser-experience/types";
import {
  verifyPageForQuestion,
  wantsDiagram,
  type PageVerdict,
  topicKeywords,
} from "@/lib/browser-experience/verify";
import {
  extractYouTubeMeta,
  openYouTubeLesson,
  searchYouTubeSources,
  wantsYouTube,
} from "@/lib/browser-experience/youtube";
import type { LessonSource } from "@/types/lesson";

const MAX_CANDIDATES_TO_CHECK = 4;

function googleSearchUrl(query: string): string {
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en");
  return url.href;
}

async function emit(
  onEvent: ((event: BrowserStreamEvent) => void) | undefined,
  event: BrowserStreamEvent,
) {
  onEvent?.(event);
}

async function showGoogleSearch(
  session: BrowserSessionRecord,
  query: string,
  onEvent?: (event: BrowserStreamEvent) => void,
) {
  const page = sessionPage(session);
  await emit(onEvent, {
    type: "status",
    status: "opening_search",
    message: "Opening Google search…",
  });
  touchSession(session, {
    status: "opening_search",
    addressBar: googleSearchUrl(query),
  });
  await emit(onEvent, { type: "session", session: toPublicSession(session) });

  try {
    await gotoSafe(page, googleSearchUrl(query), { timeoutMs: 25_000 });
    touchSession(session, {
      currentUrl: page.url(),
      addressBar: page.url(),
    });
    await emit(onEvent, { type: "session", session: toPublicSession(session) });
    await new Promise((resolve) => setTimeout(resolve, 900));
  } catch {
    /* Google often challenges automation — continue to candidates. */
  }
}

type CheckedPage = {
  source: LessonSource;
  extraction: PageExtraction;
  verdict: PageVerdict;
};

/**
 * Open each candidate, extract content, and only keep a page that
 * cross-checks against the student's question (topic + diagram needs).
 */
async function findVerifiedPage(
  session: BrowserSessionRecord,
  prompt: string,
  sources: LessonSource[],
  onEvent?: (event: BrowserStreamEvent) => void,
): Promise<CheckedPage> {
  const page = sessionPage(session);
  const candidates = sources.slice(0, MAX_CANDIDATES_TO_CHECK);
  let best: CheckedPage | null = null;

  for (let i = 0; i < candidates.length; i += 1) {
    const source = candidates[i]!;
    await emit(onEvent, {
      type: "status",
      status: "opening_source",
      message: `Checking source ${i + 1}/${candidates.length}: ${source.publisher}…`,
    });
    touchSession(session, {
      status: "opening_source",
      addressBar: source.url,
      selectedSource: source,
    });
    await emit(onEvent, { type: "session", session: toPublicSession(session) });
    await emit(onEvent, { type: "source", source });

    try {
      await gotoSafe(page, source.url, { timeoutMs: 40_000 });
      await waitForStablePage(page, { settleMs: 500, timeoutMs: 15_000 });
    } catch {
      await emit(onEvent, {
        type: "status",
        status: "reading",
        message: `Could not open ${source.publisher}. Trying next…`,
      });
      continue;
    }

    touchSession(session, {
      currentUrl: page.url(),
      addressBar: page.url(),
      status: "reading",
    });
    await emit(onEvent, { type: "session", session: toPublicSession(session) });

    await emit(onEvent, {
      type: "status",
      status: "reading",
      message: `Cross-checking ${source.publisher} for the right content…`,
    });

    let extraction: PageExtraction;
    try {
      extraction = await extractPageText(page);
    } catch {
      await emit(onEvent, {
        type: "status",
        status: "reading",
        message: `Could not read ${source.publisher}. Trying next…`,
      });
      continue;
    }

    const verdict = verifyPageForQuestion(prompt, extraction, {
      excerpt: source.excerpt,
    });
    const checked: CheckedPage = { source, extraction, verdict };

    if (!best || verdict.score > best.verdict.score) {
      best = checked;
    }

    if (verdict.ok) {
      await emit(onEvent, {
        type: "status",
        status: "reading",
        message: `Verified ${source.publisher} — this page has the content we need.`,
      });
      return checked;
    }

    await emit(onEvent, {
      type: "status",
      status: "reading",
      message: `Skipped ${source.publisher}: ${verdict.reasons[0] || "not a good match"}. Trying next…`,
    });
  }

  // No candidate fully passed — use the strongest one if it's at least usable.
  if (best && best.verdict.score >= 40 && best.extraction.text.length >= 120) {
    await emit(onEvent, {
      type: "status",
      status: "reading",
      message: `Using best available match (${best.source.publisher}).`,
    });
    // Navigate back to best if we ended on a worse page.
    const current = sessionPage(session).url();
    if (current !== best.extraction.url && current !== best.source.url) {
      try {
        await gotoSafe(sessionPage(session), best.source.url, {
          timeoutMs: 40_000,
        });
        await waitForStablePage(sessionPage(session), {
          settleMs: 500,
          timeoutMs: 15_000,
        });
        best = {
          ...best,
          extraction: await extractPageText(sessionPage(session)),
        };
      } catch {
        /* keep previous extraction */
      }
    }
    return best;
  }

  const hint = wantsDiagram(prompt)
    ? "I couldn’t find a page with a clear labeled diagram for that. Try naming the topic more specifically."
    : "I couldn’t find a page that clearly covers that topic. Try a more specific question.";
  throw new Error(hint);
}

function scoreYouTubeCandidate(
  prompt: string,
  source: LessonSource,
  title: string,
): number {
  const hay = `${title} ${source.title} ${source.excerpt}`.toLowerCase();
  const keys = topicKeywords(prompt).filter(
    (k) => !/^(youtube|video|watch|clip)$/i.test(k),
  );
  if (!keys.length) return hay.includes("youtube") ? 50 : 40;
  let hits = 0;
  for (const key of keys) {
    if (hay.includes(key)) hits += 1;
  }
  return Math.round((hits / keys.length) * 100);
}

async function findVerifiedYouTube(
  session: BrowserSessionRecord,
  prompt: string,
  sources: LessonSource[],
  onEvent?: (event: BrowserStreamEvent) => void,
): Promise<{
  source: LessonSource;
  title: string;
  url: string;
  pageText: string;
  durationSec: number | null;
}> {
  const page = sessionPage(session);
  const candidates = sources.slice(0, MAX_CANDIDATES_TO_CHECK);
  let best: {
    source: LessonSource;
    title: string;
    url: string;
    pageText: string;
    durationSec: number | null;
    score: number;
  } | null = null;

  for (let i = 0; i < candidates.length; i += 1) {
    const source = candidates[i]!;
    await emit(onEvent, {
      type: "status",
      status: "opening_source",
      message: `Checking video ${i + 1}/${candidates.length}: ${source.title.slice(0, 60)}…`,
    });
    touchSession(session, {
      status: "opening_source",
      addressBar: source.url,
      selectedSource: source,
      isYouTube: true,
    });
    await emit(onEvent, { type: "session", session: toPublicSession(session) });
    await emit(onEvent, { type: "source", source });

    const opened = await openYouTubeLesson(page, source.url);
    if (!opened.ok) {
      await emit(onEvent, {
        type: "status",
        status: "reading",
        message: "That video wouldn’t play in the lesson browser. Trying next…",
      });
      continue;
    }

    touchSession(session, {
      currentUrl: opened.url,
      addressBar: opened.url,
      status: "reading",
    });
    await emit(onEvent, { type: "session", session: toPublicSession(session) });

    const meta = await extractYouTubeMeta(page).catch(() => ({
      title: source.title,
      url: opened.url,
      durationSec: null as number | null,
    }));
    const pageText = [meta.title, source.excerpt, source.title]
      .filter(Boolean)
      .join("\n");
    const score = scoreYouTubeCandidate(prompt, source, meta.title || source.title);
    const candidate = {
      source: { ...source, url: opened.url },
      title: meta.title || source.title,
      url: opened.url,
      pageText,
      durationSec: meta.durationSec,
      score,
    };

    if (!best || candidate.score > best.score) best = candidate;

    if (score >= 35) {
      await emit(onEvent, {
        type: "status",
        status: "reading",
        message:
          opened.mode === "embed"
            ? `Playing via YouTube player: ${candidate.title.slice(0, 60)}`
            : `Found a matching video: ${candidate.title.slice(0, 70)}`,
      });
      return candidate;
    }

    await emit(onEvent, {
      type: "status",
      status: "reading",
      message: "Video title didn’t match well. Trying next…",
    });
  }

  if (best) {
    // Re-open the best playable candidate if we navigated away while scoring.
    if (sessionPage(session).url() !== best.url) {
      const reopened = await openYouTubeLesson(
        sessionPage(session),
        best.source.url,
      );
      if (reopened.ok) {
        best = { ...best, url: reopened.url, source: { ...best.source, url: reopened.url } };
      }
    }
    return best;
  }

  throw new Error(
    "YouTube blocked playback in the lesson browser for every candidate. Try again in a moment, or ask without “YouTube” to use a webpage instead.",
  );
}

export async function runBrowserAsk(input: {
  prompt: string;
  sessionId?: string;
  onEvent?: (event: BrowserStreamEvent) => void;
}): Promise<{
  session: BrowserSessionRecord;
  beats: BrowserTeachBeat[];
  summary: string;
}> {
  gcStaleSessions();
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("Prompt is required");

  let session: BrowserSessionRecord | null = null;
  if (input.sessionId) {
    try {
      session = requireSession(input.sessionId);
    } catch {
      session = null;
    }
  }

  try {
    const youtubeMode = wantsYouTube(prompt);

    await emit(input.onEvent, {
      type: "status",
      status: "searching",
      message: youtubeMode
        ? "Finding a YouTube video for that topic…"
        : "Finding candidate learning pages…",
    });

    const sources = youtubeMode
      ? await searchYouTubeSources(prompt)
      : await searchBrowserSources(prompt);
    if (!sources.length) {
      throw new Error(
        youtubeMode
          ? "No YouTube videos found for that question. Try a more specific topic."
          : "No credible sources found for that question. Try a more specific topic.",
      );
    }

    if (!session) {
      await emit(input.onEvent, {
        type: "status",
        status: "starting",
        message: "Starting browser…",
      });
      const handle = await openLiveBrowser();
      session = createSessionRecord(handle, prompt);
    } else {
      touchSession(session, {
        question: prompt,
        title: null,
        pageText: "",
        beats: [],
        selectedSource: null,
        sources,
        isYouTube: youtubeMode,
        history: [{ role: "user", content: prompt }],
      });
    }

    touchSession(session, {
      sources,
      status: "searching",
      isYouTube: youtubeMode,
    });
    await emit(input.onEvent, {
      type: "session",
      session: toPublicSession(session),
    });

    const searchQuery = youtubeMode
      ? `${prompt.replace(/\b(youtube|yt|video|watch)\b/gi, " ").trim()} site:youtube.com`
      : prompt;
    await showGoogleSearch(session, searchQuery, input.onEvent);

    if (youtubeMode) {
      const video = await findVerifiedYouTube(
        session,
        prompt,
        sources,
        input.onEvent,
      );

      touchSession(session, {
        selectedSource: video.source,
        title: video.title,
        pageText: video.pageText,
        currentUrl: video.url,
        addressBar: video.url,
        status: "teaching",
        isYouTube: true,
      });
      await emit(input.onEvent, {
        type: "session",
        session: toPublicSession(session),
      });
      await emit(input.onEvent, { type: "source", source: video.source });

      await emit(input.onEvent, {
        type: "status",
        status: "teaching",
        message: "Video ready. Planning play → seek → pause walkthrough…",
      });

      const plan = await planBrowserLesson({
        question: prompt,
        source: video.source,
        pageTitle: video.title,
        pageUrl: video.url,
        pageText: video.pageText,
        isYouTube: true,
        durationSec: video.durationSec,
        history: session.history,
        followUp: false,
      });
      const beats = beatsFromPlan(plan);

      touchSession(session, {
        beats,
        title: plan.title,
        status: "ready",
        isYouTube: true,
        history: [
          ...session.history,
          { role: "assistant", content: plan.summary },
        ],
      });

      await emit(input.onEvent, {
        type: "session",
        session: toPublicSession(session),
      });
      await emit(input.onEvent, {
        type: "beats",
        beats,
        summary: plan.summary,
      });
      await emit(input.onEvent, { type: "done" });

      return { session, beats, summary: plan.summary };
    }

    const verified = await findVerifiedPage(
      session,
      prompt,
      sources,
      input.onEvent,
    );

    touchSession(session, {
      selectedSource: verified.source,
      title: verified.extraction.title || verified.source.title,
      pageText: verified.extraction.text,
      currentUrl: verified.extraction.url,
      addressBar: verified.extraction.url,
      status: "teaching",
      isYouTube: false,
    });
    await emit(input.onEvent, {
      type: "session",
      session: toPublicSession(session),
    });
    await emit(input.onEvent, { type: "source", source: verified.source });

    await emit(input.onEvent, {
      type: "status",
      status: "teaching",
      message: "Page verified. Preparing the walkthrough…",
    });

    const plan = await planBrowserLesson({
      question: prompt,
      source: verified.source,
      pageTitle: verified.extraction.title || verified.source.title,
      pageUrl: verified.extraction.url,
      pageText: verified.extraction.text,
      anchors: verified.extraction.anchors,
      hasLargeFigure: verified.extraction.hasLargeFigure,
      isYouTube: false,
      history: session.history,
      followUp: false,
    });
    const beats = beatsFromPlan(plan);

    touchSession(session, {
      beats,
      title: plan.title,
      status: "ready",
      history: [
        ...session.history,
        { role: "assistant", content: plan.summary },
      ],
    });

    await emit(input.onEvent, {
      type: "session",
      session: toPublicSession(session),
    });
    await emit(input.onEvent, {
      type: "beats",
      beats,
      summary: plan.summary,
    });
    await emit(input.onEvent, { type: "done" });

    return { session, beats, summary: plan.summary };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while starting the browser lesson.";
    if (session) {
      touchSession(session, { status: "error" });
      await emit(input.onEvent, {
        type: "session",
        session: toPublicSession(session),
      });
    }
    await emit(input.onEvent, { type: "error", error: message });
    if (session && session.status === "error" && !session.pageText) {
      await destroySession(session.id).catch(() => undefined);
    }
    throw error instanceof Error ? error : new Error(message);
  }
}

export async function runBrowserFollowUp(input: {
  sessionId: string;
  prompt: string;
  onEvent?: (event: BrowserStreamEvent) => void;
}): Promise<{
  session: BrowserSessionRecord;
  beats: BrowserTeachBeat[];
  summary: string;
}> {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("Prompt is required");
  const session = requireSession(input.sessionId);
  const source = session.selectedSource;
  if (!source || !session.pageText) {
    throw new Error("Start a browser lesson first.");
  }

  try {
    touchSession(session, {
      question: prompt,
      status: "teaching",
      history: [...session.history, { role: "user", content: prompt }],
    });
    await emit(input.onEvent, {
      type: "status",
      status: "teaching",
      message: session.isYouTube
        ? "Jumping to the relevant part of this video…"
        : "Answering from this verified page…",
    });
    await emit(input.onEvent, {
      type: "session",
      session: toPublicSession(session),
    });

    let durationSec: number | null = null;
    let anchors: string[] = [];
    let hasLargeFigure = false;

    if (session.isYouTube) {
      const meta = await extractYouTubeMeta(sessionPage(session)).catch(() => null);
      if (meta) {
        durationSec = meta.durationSec;
        touchSession(session, {
          title: meta.title || session.title,
          currentUrl: meta.url,
          addressBar: meta.url,
        });
      }
    } else {
      const extracted = await extractPageText(sessionPage(session)).catch(() => ({
        title: session.title || source.title,
        url: session.currentUrl,
        text: session.pageText,
        anchors: [] as string[],
        hasLargeFigure: false,
      }));
      anchors = extracted.anchors;
      hasLargeFigure = extracted.hasLargeFigure;
      if (extracted.text.length > 80) {
        touchSession(session, {
          pageText: extracted.text,
          title: extracted.title || session.title,
          currentUrl: extracted.url,
          addressBar: extracted.url,
        });
      }
    }

    const plan = await planBrowserLesson({
      question: prompt,
      source,
      pageTitle: session.title || source.title,
      pageUrl: session.currentUrl,
      pageText: session.pageText,
      anchors,
      hasLargeFigure,
      isYouTube: session.isYouTube,
      durationSec,
      history: session.history,
      followUp: true,
    });
    const beats = beatsFromPlan(plan);

    touchSession(session, {
      beats,
      title: plan.title,
      status: "ready",
      history: [
        ...session.history,
        { role: "assistant", content: plan.summary },
      ],
    });

    await emit(input.onEvent, {
      type: "session",
      session: toPublicSession(session),
    });
    await emit(input.onEvent, {
      type: "beats",
      beats,
      summary: plan.summary,
    });
    await emit(input.onEvent, { type: "done" });

    return { session, beats, summary: plan.summary };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not answer that follow-up.";
    touchSession(session, { status: "error" });
    await emit(input.onEvent, { type: "error", error: message });
    throw error instanceof Error ? error : new Error(message);
  }
}
