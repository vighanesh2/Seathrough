import { randomUUID } from "node:crypto";
import type { Page } from "playwright-core";
import {
  applyAnnotation,
  closeHandle,
  type LiveBrowserHandle,
} from "@/lib/browser-experience/driver";
import { closeBrowserbaseRemote } from "@/lib/browser-experience/browserbase";
import type {
  BrowserAnnotation,
  BrowserChatMessage,
  BrowserProvider,
  BrowserSessionPublic,
  BrowserSessionStatus,
  BrowserTeachBeat,
} from "@/lib/browser-experience/types";
import type { LessonSource } from "@/types/lesson";

export type BrowserSessionRecord = {
  id: string;
  provider: BrowserProvider;
  remoteSessionId?: string;
  liveViewUrl: string | null;
  currentUrl: string;
  addressBar: string;
  status: BrowserSessionStatus;
  question: string;
  selectedSource: LessonSource | null;
  sources: LessonSource[];
  title: string | null;
  pageText: string;
  beats: BrowserTeachBeat[];
  history: BrowserChatMessage[];
  isYouTube: boolean;
  createdAt: number;
  updatedAt: number;
  handle: LiveBrowserHandle;
};

type Store = Map<string, BrowserSessionRecord>;

const GLOBAL_KEY = "__seethrough_browser_sessions__";

function store(): Store {
  const g = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Store };
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map();
  return g[GLOBAL_KEY];
}

export function createSessionRecord(
  handle: LiveBrowserHandle,
  question: string,
): BrowserSessionRecord {
  const id = randomUUID();
  const now = Date.now();
  const record: BrowserSessionRecord = {
    id,
    provider: handle.provider,
    remoteSessionId: handle.remoteSessionId,
    liveViewUrl: handle.liveViewUrl,
    currentUrl: "about:blank",
    addressBar: "about:blank",
    status: "starting",
    question,
    selectedSource: null,
    sources: [],
    title: null,
    pageText: "",
    beats: [],
    history: [{ role: "user", content: question }],
    isYouTube: false,
    createdAt: now,
    updatedAt: now,
    handle,
  };
  store().set(id, record);
  return record;
}

export function getSession(sessionId: string): BrowserSessionRecord | null {
  return store().get(sessionId) ?? null;
}

export function requireSession(sessionId: string): BrowserSessionRecord {
  const session = getSession(sessionId);
  if (!session || session.status === "closed") {
    throw new Error("Session not found");
  }
  return session;
}

export function toPublicSession(
  session: BrowserSessionRecord,
): BrowserSessionPublic {
  return {
    id: session.id,
    provider: session.provider,
    liveViewUrl: session.liveViewUrl,
    frameStream: session.provider === "local" || !session.liveViewUrl,
    currentUrl: session.currentUrl,
    addressBar: session.addressBar,
    status: session.status,
    question: session.question,
    selectedSource: session.selectedSource,
    sources: session.sources,
    title: session.title,
    beats: session.beats,
    history: session.history,
    isYouTube: session.isYouTube,
  };
}

export function touchSession(
  session: BrowserSessionRecord,
  patch: Partial<
    Omit<BrowserSessionRecord, "id" | "handle" | "createdAt" | "provider">
  >,
): BrowserSessionRecord {
  Object.assign(session, patch, { updatedAt: Date.now() });
  store().set(session.id, session);
  return session;
}

export function sessionPage(session: BrowserSessionRecord): Page {
  return session.handle.page;
}

export async function annotateSession(
  sessionId: string,
  annotation: BrowserAnnotation,
) {
  const session = requireSession(sessionId);
  try {
    return await applyAnnotation(sessionPage(session), annotation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/Execution context was destroyed|navigation/i.test(message)) {
      return { ok: false, reason: "page_navigating" };
    }
    throw error;
  }
}

export async function destroySession(sessionId: string): Promise<void> {
  const session = getSession(sessionId);
  if (!session) return;
  session.status = "closed";
  try {
    if (session.provider === "local") {
      await session.handle.page.context().close().catch(() => undefined);
    } else {
      await closeHandle(session.handle);
      if (session.remoteSessionId) {
        await closeBrowserbaseRemote(session.remoteSessionId);
      }
    }
  } finally {
    store().delete(sessionId);
  }
}

/** Drop sessions older than 2 hours (best-effort GC). */
export function gcStaleSessions(maxAgeMs = 2 * 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [id, session] of store()) {
    if (now - session.updatedAt > maxAgeMs) {
      void destroySession(id);
    }
  }
}
