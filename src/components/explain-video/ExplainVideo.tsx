"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { BrandMark } from "@/components/lms/BrandMark";
import { directFilm, type DirectorStatus } from "@/components/explain-video/direct";
import type { FilmEngine } from "@/components/explain-video/engine";
import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  paintHold,
  paintPlan,
  type FontSet,
} from "@/components/explain-video/paint";
import { shootFilm } from "@/components/explain-video/shoot";
import { mixNarration, recordNarration, type Narration } from "@/components/explain-video/voice";
import { saveLocalVideo } from "@/lib/experiment/localSavedVideos";
import { EXPLAIN_VIDEO_KIND } from "@/lib/experiment/savedVideoKind";
import {
  planSchema,
  retimeToVoice,
  sceneCodeResponseSchema,
  type Plan,
} from "@/lib/explain-video/film";

const FALLBACK_FONTS: FontSet = {
  display: "Georgia, serif",
  sans: "Inter, sans-serif",
  mono: "ui-monospace, monospace",
};

const WRITE_FAILED = "The film could not be written. Try again in a moment.";
const DRAW_FAILED = "The film could not be drawn. Try again in a moment.";

function readFonts(): FontSet {
  const css = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    display: pick("--font-fraunces", FALLBACK_FONTS.display),
    sans: pick("--font-geist", FALLBACK_FONTS.sans),
    mono: pick("--font-ibm-plex-mono", FALLBACK_FONTS.mono),
  };
}

function firstFamily(stack: string): string {
  const part = stack.split(",")[0]?.trim() ?? stack;
  return part.replace(/^["']|["']$/g, "") || stack;
}

async function ensureFonts(fonts: FontSet): Promise<void> {
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load(`600 72px "${firstFamily(fonts.display)}"`),
    document.fonts.load(`400 32px "${firstFamily(fonts.sans)}"`),
    document.fonts.load(`500 28px "${firstFamily(fonts.mono)}"`),
  ]).catch(() => undefined);
}

function listScenes(indexes: number[]): string {
  const numbers = indexes.map((index) => index + 1);
  return numbers.length === 1 ? `Scene ${numbers[0]}` : `Scenes ${numbers.join(", ")}`;
}

function narrationGap(narration: Narration, voiced: boolean, total: number): string {
  if (!narration.ok) return `No narration (${narration.reason}); the film has captions only.`;
  if (!voiced) return "The narration could not be encoded; the film has captions only.";
  const silent = Array.from({ length: total }, (_, index) => index).filter((index) => !narration.clips[index]);
  if (!silent.length) return "";
  return `${listScenes(silent)} ${silent.length === 1 ? "has" : "have"} no narration.`;
}

function fileSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "explanation";
}

async function postJson(url: string, body: unknown, fallback: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`${fallback.replace(/ Try again in a moment\.$/, "")} Check your connection and try again.`);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : fallback;
    throw new Error(message);
  }
  return payload;
}

type Phase = "idle" | "planning" | "writing" | "checking" | "filming" | "ready";

const BUSY: Phase[] = ["planning", "writing", "checking", "filming"];

/** The finished film, kept so Save can upload the exact file that plays. */
type Finished = { blob: Blob; plan: Plan; topic: string; durationMs: number; poster: Blob | null };

type SaveState = "idle" | "saving" | "saved-cloud" | "saved-device" | "failed";

/** Long enough that the spinner reads as a step, not a flicker. */
const SAVE_MIN_MS = 650;
const DASHBOARD_TAB = "/dashboard?tab=explain";

function capturePoster(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const small = document.createElement("canvas");
  small.width = 640;
  small.height = 360;
  const ctx = small.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(canvas, 0, 0, small.width, small.height);
  return new Promise((resolve) => small.toBlob((blob) => resolve(blob), "image/jpeg", 0.82));
}

async function uploadFilm(film: Finished, accessToken: string): Promise<void> {
  const form = new FormData();
  const ext = film.blob.type.includes("mp4") ? "mp4" : "webm";
  form.set("video", film.blob, `explanation.${ext}`);
  if (film.poster) form.set("poster", film.poster, "poster.jpg");
  form.set("title", film.plan.title);
  form.set("topic", film.topic);
  form.set("plan", JSON.stringify(film.plan));
  form.set("durationMs", String(film.durationMs));
  const response = await fetch("/api/explain-video/saved", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!response.ok) throw new Error(`save failed (${response.status})`);
}

function SaveTick() {
  return (
    <svg viewBox="0 0 24 24" className="save-tick size-5" fill="none" aria-hidden>
      <circle className="save-tick-ring" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        className="save-tick-check"
        d="M7.5 12.5l3 3 6-6.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SaveSpinner() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 animate-spin" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function ExplainVideo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fontsRef = useRef<FontSet>(FALLBACK_FONTS);
  const topicRef = useRef("");
  const phaseRef = useRef<Phase>("idle");
  const runRef = useRef(0);
  const engineRef = useRef<FilmEngine | null>(null);
  const videoUrlRef = useRef<string | null>(null);
  const shotRef = useRef({ percent: -1 });
  const finishedRef = useRef<Finished | null>(null);
  const { accessToken } = useAuth();

  const [topic, setTopic] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [phase, setPhase] = useState<Phase>("idle");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [progress, setProgress] = useState(0);
  const [director, setDirector] = useState<DirectorStatus | null>(null);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("explanation.mp4");

  useEffect(() => {
    topicRef.current = topic;
    phaseRef.current = phase;
    videoUrlRef.current = videoUrl;
  }, [topic, phase, videoUrl]);

  useEffect(() => {
    fontsRef.current = readFonts();
    void ensureFonts(fontsRef.current).then(() => {
      fontsRef.current = readFonts();
    });
  }, []);

  useEffect(() => {
    return () => {
      runRef.current += 1;
      engineRef.current?.dispose();
      engineRef.current = null;
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const holding = phase === "idle" || phase === "planning";
    const planning = (phase === "writing" || phase === "checking") && plan;
    if (!holding && !planning) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;
    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const time = reduce ? 3 : (now - started) / 1000;
      if (holding) {
        paintHold(ctx, fontsRef.current, time, {
          writing: phaseRef.current === "planning",
          topic: topicRef.current,
        });
      } else if (plan) {
        paintPlan(ctx, fontsRef.current, plan, time, phase === "writing" ? "writing" : "checking");
      }
      if (!reduce) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [phase, plan]);

  function replaceVideo(next: string | null) {
    setVideoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const cleaned = topic.trim();
    if (!cleaned || BUSY.includes(phase)) return;
    if (cleaned.length > 400) {
      setError("Enter a topic between 1 and 400 characters.");
      return;
    }

    const run = ++runRef.current;
    const alive = () => run === runRef.current;
    engineRef.current?.dispose();
    engineRef.current = null;
    shotRef.current = { percent: -1 };
    finishedRef.current = null;
    setSaveState("idle");
    setError("");
    setProgress(0);
    setDirector(null);
    setPlan(null);
    replaceVideo(null);
    setPhase("planning");

    try {
      const planned = planSchema.safeParse(
        await postJson("/api/explain-video", { topic: cleaned }, WRITE_FAILED),
      );
      if (!alive()) return;
      if (!planned.success) throw new Error("The film plan came back incomplete. Try a clearer topic.");
      const film = planned.data;
      await ensureFonts(fontsRef.current);
      if (!alive()) return;
      setPlan(film);
      setPhase("writing");

      const recording = recordNarration(film.scenes.map((scene) => scene.speak)).catch(
        (): Narration => ({ ok: false, reason: "failed" }),
      );
      const drawn = sceneCodeResponseSchema.safeParse(
        await postJson("/api/explain-video/scenes", { topic: cleaned, plan: film }, DRAW_FAILED),
      );
      if (!alive()) return;
      if (!drawn.success || drawn.data.scenes.length !== film.scenes.length) throw new Error(DRAW_FAILED);
      const narration = await recording;
      if (!alive()) return;
      const timed = narration.ok
        ? retimeToVoice(film, narration.clips.map((clip) => clip?.duration ?? null))
        : film;
      setPlan(timed);
      setPhase("checking");

      const directed = await directFilm({
        topic: cleaned,
        plan: timed,
        codes: drawn.data.scenes.map((scene) => scene.code),
        serverErrors: drawn.data.scenes.map((scene) => scene.error),
        onStatus: (status) => {
          if (alive()) setDirector(status);
        },
        isCancelled: () => !alive(),
      });
      if (!directed) return;
      if (!alive()) {
        directed.engine.dispose();
        return;
      }
      if (directed.fallbacks.length === film.scenes.length) {
        directed.engine.dispose();
        throw new Error(DRAW_FAILED);
      }
      engineRef.current = directed.engine;

      const audio = narration.ok ? await mixNarration(timed, narration.clips).catch(() => null) : null;
      if (!alive()) return;
      const canvas = canvasRef.current;
      if (!canvas) throw new Error(DRAW_FAILED);
      setPhase("filming");
      const poster: { shot: Promise<Blob | null> | null } = { shot: null };
      const shot = await shootFilm({
        engine: directed.engine,
        canvas,
        fps: directed.fps,
        audio,
        isCancelled: () => !alive(),
        onFrame: ({ frame, frames }) => {
          if (!alive()) return;
          if (!poster.shot && frame >= Math.floor(frames * 0.35)) {
            poster.shot = capturePoster(canvas).catch(() => null);
          }
          const percent = Math.floor((frame / Math.max(1, frames - 1)) * 100);
          if (percent !== shotRef.current.percent) {
            shotRef.current.percent = percent;
            setProgress(percent / 100);
          }
        },
      });
      directed.engine.dispose();
      if (engineRef.current === directed.engine) engineRef.current = null;
      if (!alive()) return;
      if (!shot) throw new Error("The film played, but this browser did not save a video file.");

      finishedRef.current = {
        blob: shot.blob,
        plan: timed,
        topic: cleaned,
        durationMs: Math.round(timed.scenes.reduce((sum, scene) => sum + scene.seconds, 0) * 1000),
        poster: poster.shot ? await poster.shot : null,
      };
      if (!alive()) return;
      replaceVideo(URL.createObjectURL(shot.blob));
      setDownloadName(`${fileSlug(film.title)}.${shot.blob.type.includes("mp4") ? "mp4" : "webm"}`);
      if (directed.fallbacks.length) {
        console.warn("[explain-video]", `${listScenes(directed.fallbacks)} fell back to the title card.`);
      }
      const voiceGap = narrationGap(narration, Boolean(audio) && shot.voiced, timed.scenes.length);
      if (voiceGap) console.warn("[explain-video]", voiceGap);
      setPhase("ready");
    } catch (cause) {
      if (!alive()) return;
      engineRef.current?.dispose();
      engineRef.current = null;
      setPhase("idle");
      setPlan(null);
      const message = cause instanceof Error && cause.message ? cause.message : WRITE_FAILED;
      setError(/^(The film |This browser |Enter a topic|Our app is facing)/.test(message) ? message : DRAW_FAILED);
    }
  }

  async function onSave() {
    const film = finishedRef.current;
    if (!film || saveState === "saving" || saveState === "saved-cloud" || saveState === "saved-device") return;
    const run = runRef.current;
    setSaveState("saving");
    const started = performance.now();
    const settle = async (next: SaveState) => {
      const wait = SAVE_MIN_MS - (performance.now() - started);
      if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
      if (run === runRef.current) setSaveState(next);
    };
    if (accessToken) {
      try {
        await uploadFilm(film, accessToken);
        await settle("saved-cloud");
        return;
      } catch (cause) {
        console.warn("[explain-video] cloud save failed, keeping a copy on this device", cause);
      }
    }
    try {
      await saveLocalVideo({
        kind: EXPLAIN_VIDEO_KIND,
        title: film.plan.title,
        titleSource: "ai",
        question: film.topic,
        durationMs: film.durationMs,
        mimeType: film.blob.type,
        video: film.blob,
        poster: film.poster ?? undefined,
      });
      await settle("saved-device");
    } catch (cause) {
      console.warn("[explain-video] save failed", cause);
      await settle("failed");
    }
  }

  const saved = saveState === "saved-cloud" || saveState === "saved-device";
  const busy = BUSY.includes(phase);
  const status =
    error ||
    (phase === "planning"
      ? "Planning the film"
      : phase === "writing"
        ? "Plan ready. Drawing the scenes and recording the narration"
        : phase === "checking"
          ? director?.kind === "repairing"
            ? `Redrawing ${director.count === 1 ? "one scene" : `${director.count} scenes`}`
            : `Checking scene ${(director?.kind === "checking" ? director.index : 0) + 1} of ${plan?.scenes.length ?? 0}`
          : phase === "filming"
            ? `Filming ${Math.round(progress * 100)}%`
            : phase === "ready" && plan
              ? plan.title
              : "");

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="px-5 py-4 sm:px-8">
        <BrandMark />
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col justify-center gap-5 px-4 pt-1 pb-6 sm:px-6">
        <h1 className="sr-only">Video explainer</h1>
        <div className="mx-auto w-full max-w-[min(100%,calc((100dvh-14rem)*16/9))] overflow-hidden rounded-none border border-board-edge bg-ink shadow-[0_18px_40px_-24px_rgba(16,32,48,0.45)]">
          <div className="relative aspect-video w-full">
            <canvas
              ref={canvasRef}
              className={videoUrl ? "hidden" : "h-full w-full"}
              aria-hidden={videoUrl ? true : undefined}
            />
            {videoUrl ? (
              <video
                key={videoUrl}
                src={videoUrl}
                className="h-full w-full bg-ink"
                controls
                autoPlay
                playsInline
                aria-label={plan?.title ?? "Explanation video"}
              />
            ) : null}
          </div>
          {phase === "filming" ? (
            <div className="h-1 bg-white/10" aria-hidden>
              <div
                className="h-full bg-accent transition-[width] duration-200"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          ) : null}
        </div>


        <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="explain-topic">
            Topic
          </label>
          <input
            id="explain-topic"
            name="topic"
            value={topic}
            maxLength={400}
            autoComplete="off"
            placeholder="How does a vaccine teach the immune system?"
            disabled={busy}
            onChange={(event) => setTopic(event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-none border border-board-edge bg-chalk px-4 font-sans text-sm text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-3 focus:ring-accent-soft disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || topic.trim().length === 0}
            aria-busy={busy}
            className="h-11 shrink-0 rounded-none bg-accent px-5 font-sans text-sm font-semibold text-white outline-none transition hover:bg-accent-deep focus-visible:ring-3 focus-visible:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            {phase === "planning"
              ? "Planning"
              : phase === "writing" || phase === "checking"
                ? "Drawing"
                : phase === "filming"
                  ? "Filming"
                  : "Generate"}
          </button>
          {videoUrl && phase === "ready" ? (
            saved ? (
              <Link
                href={DASHBOARD_TAB}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-none border border-accent bg-accent-soft px-4 font-sans text-sm font-semibold text-accent-deep outline-none transition hover:bg-chalk focus-visible:ring-3 focus-visible:ring-accent-soft"
                aria-label="Saved. View it in your dashboard"
              >
                <SaveTick />
                Saved
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void onSave()}
                disabled={saveState === "saving"}
                aria-busy={saveState === "saving"}
                className="inline-flex h-11 min-w-24 shrink-0 items-center justify-center gap-2 rounded-none border border-board-edge bg-chalk px-4 font-sans text-sm font-semibold text-ink outline-none transition hover:bg-paper focus-visible:ring-3 focus-visible:ring-accent-soft disabled:cursor-wait"
              >
                {saveState === "saving" ? (
                  <>
                    <SaveSpinner />
                    Saving
                  </>
                ) : saveState === "failed" ? (
                  "Try saving again"
                ) : (
                  "Save"
                )}
              </button>
            )
          ) : null}
          {videoUrl ? (
            <a
              href={videoUrl}
              download={downloadName}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-none border border-board-edge bg-chalk px-4 font-sans text-sm font-medium text-ink outline-none hover:bg-paper focus-visible:ring-3 focus-visible:ring-accent-soft"
            >
              Download
            </a>
          ) : null}
        </form>
        <p
          className={`min-h-6 text-center font-sans text-sm ${error ? "text-warn" : "text-muted"}`}
          role="status"
        >
          {saved && phase === "ready" ? (
            <>
              {saveState === "saved-cloud"
                ? "Saved to Video explainer. "
                : "Saved on this device. Sign in to keep it saved to your account. "}
              <Link href={DASHBOARD_TAB} className="font-medium text-accent underline-offset-2 hover:underline">
                Open dashboard
              </Link>
            </>
          ) : (
            status
          )}
        </p>
      </main>
    </div>
  );
}
