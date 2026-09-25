"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Maximize, Minimize, Pause, Pencil, Play, Trash2, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { SiteHeader } from "@/components/site/SiteHeader";
import { StudioAccessProvider } from "@/components/site/StudioAccess";
import { useQuestionAccess } from "@/components/usage/QuestionAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SavedLessonVideo } from "@/lib/experiment/savedVideos";
import {
  deleteLocalVideo,
  listLocalVideos,
  renameLocalVideo,
} from "@/lib/experiment/localSavedVideos";
import { fixWebmDuration } from "@/lib/experiment/fixWebmDuration";
import { clipTitle } from "@/lib/experiment/lessonTitle";

type ListedVideo = SavedLessonVideo & { local?: boolean };

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

function LessonVideo({
  video,
  onError,
}: {
  video: ListedVideo;
  onError: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [src, setSrc] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const lengthSeconds = (video.durationMs ?? 0) / 1000;

  useEffect(() => {
    frameRef.current?.focus();
  }, [video.id]);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;
    setSrc(null);
    setCurrent(0);
    setPlaying(false);

    async function prepare() {
      if (!video.videoUrl) return;
      let next = video.videoUrl;
      if ((video.durationMs ?? 0) > 1000) {
        try {
          const response = await fetch(video.videoUrl);
          const blob = await response.blob();
          const patched = await fixWebmDuration(blob, video.durationMs ?? 0);
          if (patched !== blob) {
            created = URL.createObjectURL(patched);
            next = created;
          }
        } catch {
          /* play the original file */
        }
      }
      if (cancelled) {
        if (created) URL.revokeObjectURL(created);
        return;
      }
      setSrc(next);
    }

    void prepare();
    return () => {
      cancelled = true;
      ref.current?.pause();
      if (created) URL.revokeObjectURL(created);
    };
  }, [video.id, video.videoUrl, video.durationMs]);

  async function downloadVideo() {
    const url = src || video.videoUrl;
    if (!url) return;
    const ext = /mp4/i.test(video.mimeType || "") ? "mp4" : "webm";
    const name = `${video.title.replace(/[^\w\s-]+/g, "").trim() || "lesson"}.${ext}`;
    let href = url;
    let created: string | null = null;
    if (!url.startsWith("blob:")) {
      const response = await fetch(url);
      const blob = await response.blob();
      created = URL.createObjectURL(blob);
      href = created;
    }
    const link = document.createElement("a");
    link.href = href;
    link.download = name;
    link.click();
    if (created) window.setTimeout(() => URL.revokeObjectURL(created), 1000);
  }

  function togglePlay() {
    const element = ref.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => undefined);
    else element.pause();
  }

  function seekTo(clientX: number) {
    const element = ref.current;
    const track = trackRef.current;
    if (!element || !track) return;
    const length = lengthSeconds > 0 ? lengthSeconds : element.duration;
    if (!Number.isFinite(length) || length <= 0) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    element.currentTime = ratio * length;
    setCurrent(element.currentTime);
  }

  const knownDuration = lengthSeconds > 0 ? lengthSeconds : 0;
  const progress = knownDuration > 0 ? Math.min(1, current / knownDuration) : 0;

  return (
    <div
      ref={frameRef}
      tabIndex={0}
      className={`bg-[#f7f4ee] outline-none ${fullscreen ? "flex h-full flex-col" : ""}`}
      onKeyDown={(event) => {
        const element = ref.current;
        if (!element) return;
        if (event.key === " " || event.key === "k") {
          event.preventDefault();
          togglePlay();
        } else if (event.key === "ArrowRight") {
          element.currentTime = Math.min(knownDuration || element.duration || 0, element.currentTime + 5);
        } else if (event.key === "ArrowLeft") {
          element.currentTime = Math.max(0, element.currentTime - 5);
        } else if (event.key === "m") {
          element.muted = !element.muted;
          setMuted(element.muted);
        }
      }}
    >
      {src ? (
        <video
          ref={ref}
          key={src}
          src={src}
          poster={video.posterUrl}
          autoPlay
          playsInline
          preload="auto"
          className={`w-full cursor-pointer bg-[#1c1915] ${fullscreen ? "min-h-0 flex-1 object-contain" : "max-h-[68vh]"}`}
          onClick={togglePlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={() => {
            const element = ref.current;
            if (!element) return;
            const at = element.currentTime;
            if (knownDuration > 0 && at >= knownDuration - 0.05) {
              element.pause();
              setCurrent(knownDuration);
              setPlaying(false);
              return;
            }
            setCurrent(at);
          }}
          onError={onError}
        />
      ) : (
        <div className="flex max-h-[68vh] min-h-48 w-full items-center justify-center bg-[#1c1915] text-[13px] text-white/70">
          Opening the lesson…
        </div>
      )}
      <div className="border-t border-[#e4dccf] px-4 py-3">
        <div
          ref={trackRef}
          className="group relative h-3 cursor-pointer"
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(knownDuration)}
          aria-valuenow={Math.round(current)}
          tabIndex={0}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            seekTo(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) seekTo(event.clientX);
          }}
        >
          <div className="absolute top-1 right-0 left-0 h-1 bg-[#e4dccf]" />
          <div
            className="absolute top-1 left-0 h-1 bg-[#085080]"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-0 size-3 border border-[#085080] bg-white"
            style={{ left: `calc(${progress * 100}% - 6px)` }}
          />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            className="flex size-8 items-center justify-center bg-[#085080] text-white outline-none hover:bg-[#083068] focus-visible:ring-2 focus-visible:ring-[#085080]/40"
            aria-label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
          >
            {playing ? <Pause className="size-3.5" /> : <Play className="ml-0.5 size-3.5" />}
          </button>
          <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[12px] tracking-wide text-[#5c5348]">
            {formatClock(current)}
            <span className="px-1 text-[#b3a894]">/</span>
            {formatClock(knownDuration)}
          </p>
          <button
            type="button"
            className="ml-auto flex size-8 items-center justify-center text-[#5c5348] outline-none hover:text-[#111111] focus-visible:ring-2 focus-visible:ring-[#085080]/40"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => {
              const element = ref.current;
              if (!element) return;
              element.muted = !element.muted;
              setMuted(element.muted);
            }}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <button
            type="button"
            className="flex size-8 items-center justify-center text-[#5c5348] outline-none hover:text-[#111111] focus-visible:ring-2 focus-visible:ring-[#085080]/40"
            aria-label="Download"
            onClick={() => void downloadVideo()}
          >
            <Download className="size-4" />
          </button>
          <button
            type="button"
            className="flex size-8 items-center justify-center text-[#5c5348] outline-none hover:text-[#111111] focus-visible:ring-2 focus-visible:ring-[#085080]/40"
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            onClick={() => {
              const frame = frameRef.current;
              if (!frame) return;
              if (document.fullscreenElement === frame) void document.exitFullscreen();
              else void frame.requestFullscreen();
            }}
          >
            {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoThumb({ video }: { video: ListedVideo }) {
  const [shot, setShot] = useState(video.posterUrl ?? "");

  useEffect(() => {
    if (!video.videoUrl) return;
    let cancelled = false;
    const element = document.createElement("video");
    element.muted = true;
    element.playsInline = true;
    element.preload = "auto";
    element.src = video.videoUrl;

    const paint = () => {
      if (cancelled || !element.videoWidth) return;
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
      setShot(canvas.toDataURL("image/jpeg", 0.72));
    };

    const onReady = () => {
      paint();
      const length = element.duration;
      const at = Number.isFinite(length) && length > 0.4 ? Math.min(1.2, length * 0.2) : 0;
      if (at > 0) {
        try {
          element.currentTime = at;
        } catch {
          /* the first frame is enough */
        }
      }
    };

    element.addEventListener("loadeddata", onReady);
    element.addEventListener("seeked", paint);
    return () => {
      cancelled = true;
      element.removeEventListener("loadeddata", onReady);
      element.removeEventListener("seeked", paint);
      element.src = "";
    };
  }, [video.id, video.videoUrl]);

  return shot ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={shot} alt="" className="size-full object-cover" />
  ) : (
    <span className="absolute inset-0 bg-[#f4f5f7]" />
  );
}

function formatDuration(ms?: number): string {
  if (!ms || ms < 1000) return "";
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function SavedVideosDashboard() {
  return (
    <StudioAccessProvider>
      <SavedVideosDashboardView />
    </StudioAccessProvider>
  );
}

function SavedVideosDashboardView() {
  const { accessToken, user, loading } = useAuth();

  useEffect(() => {
    document.documentElement.classList.add("marketing-page");
    return () => {
      document.documentElement.classList.remove("marketing-page");
    };
  }, []);
  const { openAuth } = useQuestionAccess();
  const [videos, setVideos] = useState<ListedVideo[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [playing, setPlaying] = useState<ListedVideo | null>(null);
  const [playError, setPlayError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const local = await listLocalVideos();
      let remote: SavedLessonVideo[] = [];
      if (accessToken) {
        const res = await fetch("/api/experiment/videos", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const body = (await res.json()) as {
          videos?: SavedLessonVideo[];
          error?: string;
        };
        if (res.ok) remote = body.videos ?? [];
      }
      const remoteIds = new Set(remote.map((item) => item.id));
      const merged: ListedVideo[] = [
        ...remote,
        ...local.filter((item) => !remoteIds.has(item.id)),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setVideos(merged);
    } catch {
      setError("Could not load saved videos.");
    } finally {
      setBusy(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!playing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.fullscreenElement) return;
      setPlaying(null);
      setPlayError("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  async function commitRename(video: ListedVideo) {
    const title = clipTitle(draftTitle);
    setEditingId(null);
    if (!title || title === video.title) return;
    setVideos((current) =>
      current.map((item) =>
        item.id === video.id
          ? { ...item, title, titleSource: "user" }
          : item,
      ),
    );
    try {
      if (video.local || !accessToken) {
        await renameLocalVideo(video.id, title);
        return;
      }
      const res = await fetch(`/api/experiment/videos/${video.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("rename failed");
    } catch {
      setError("Could not rename that video.");
      void load();
    }
  }

  async function removeVideo(video: ListedVideo) {
    setVideos((current) => current.filter((item) => item.id !== video.id));
    if (playing?.id === video.id) setPlaying(null);
    try {
      if (video.local || !accessToken) {
        await deleteLocalVideo(video.id);
        return;
      }
      await fetch(`/api/experiment/videos/${video.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      setError("Could not delete that video.");
      void load();
    }
  }

  const empty = !busy && videos.length === 0;
  const signedOutHint = useMemo(
    () => !user && !loading,
    [user, loading],
  );

  return (
    <div className="min-h-dvh bg-white font-[family-name:var(--font-inter)] text-[#111111]">
      <SiteHeader variant="marketing" />

      <main className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-24">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[2.6rem] leading-[1.08] font-medium tracking-[-0.035em] text-[#111111] sm:text-[3.25rem]">
              Dashboard
            </h1>
            <p className="mt-4 max-w-sm text-[15px] leading-6 text-[#5c6370]">
              Lessons you recorded in Smart tutor. Click a title to rename it.
            </p>
          </div>
          <Link
            href="/smart-tutor"
            className="inline-flex h-11 shrink-0 items-center bg-[#085080] px-5 text-[14px] font-medium text-white outline-none transition hover:bg-[#083068] focus-visible:ring-2 focus-visible:ring-[#085080]/40"
          >
            New lesson
          </Link>
        </div>

        {signedOutHint ? (
          <p className="mt-8 text-[14px] text-[#5c6370]">
            Videos on this device stay here.{" "}
            <button
              type="button"
              className="font-medium text-[#085080] underline-offset-2 outline-none hover:underline"
              onClick={() => openAuth("login")}
            >
              Sign in
            </button>{" "}
            to keep them in the cloud.
          </p>
        ) : null}

        {error ? (
          <p className="mt-6 text-[14px] text-[#c24545]" role="alert">
            {error}
          </p>
        ) : null}

        {busy ? (
          <p className="mt-10 text-[15px] text-[#5c6370]">Loading saved videos…</p>
        ) : null}

        {empty ? (
          <div className="mt-12 border border-[#e6e8ee] px-6 py-16 text-center">
            <p className="text-[16px] font-medium text-[#111111]">No saved videos yet</p>
            <p className="mx-auto mt-2 max-w-md text-[15px] leading-6 text-[#5c6370]">
              Ask something in Smart tutor, hit Record and share this tab, then
              Stop when you are done. The video lands here.
            </p>
            <Link
              href="/smart-tutor"
              className="mt-6 inline-flex h-11 items-center bg-[#085080] px-5 text-[14px] font-medium text-white outline-none transition hover:bg-[#083068] focus-visible:ring-2 focus-visible:ring-[#085080]/40"
            >
              Open Smart tutor
            </Link>
          </div>
        ) : (
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <li
                key={video.id}
                className="overflow-hidden border border-[#e6e8ee] bg-white"
              >
                <button
                  type="button"
                  className="relative block aspect-video w-full bg-[#f4f5f7]"
                  onClick={() => {
                    setPlayError("");
                    setPlaying(video);
                  }}
                  aria-label={`Play ${video.title}`}
                >
                  <VideoThumb video={video} />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-11 items-center justify-center bg-white text-[#085080]">
                      <Play className="size-4 fill-current" />
                    </span>
                  </span>
                  {formatDuration(video.durationMs) ? (
                    <span className="absolute right-2 bottom-2 bg-[#111111]/80 px-1.5 py-0.5 font-mono text-[11px] text-white">
                      {formatDuration(video.durationMs)}
                    </span>
                  ) : null}
                </button>
                <div className="px-3.5 py-3">
                  {editingId === video.id ? (
                    <Input
                      value={draftTitle}
                      autoFocus
                      maxLength={60}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      onBlur={() => void commitRename(video)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void commitRename(video);
                        }
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      className="h-8 text-[14px]"
                      aria-label="Rename video"
                    />
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 text-left"
                      onClick={() => {
                        setEditingId(video.id);
                        setDraftTitle(video.title);
                      }}
                    >
                      <span className="min-w-0 flex-1 text-[15px] font-medium leading-5 text-[#111111]">
                        {video.title}
                      </span>
                      <Pencil className="mt-0.5 size-3.5 shrink-0 text-muted" />
                    </button>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-[12px] text-[#5c6370]">
                      {formatWhen(video.createdAt)}
                      {video.local ? " · this device" : ""}
                    </p>
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted hover:bg-[#f4f7fb] hover:text-error"
                      aria-label={`Delete ${video.title}`}
                      onClick={() => void removeVideo(video)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {playing?.videoUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2b3c]/55 p-4"
          onClick={() => {
            setPlaying(null);
            setPlayError("");
          }}
        >
          <div
            className="w-full max-w-3xl overflow-hidden bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 bg-[#f7f4ee] px-4 py-3">
              <p className="truncate font-[family-name:var(--font-newsreader)] text-[1.2rem] tracking-tight text-[#111111]">
                {playing.title}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPlaying(null);
                  setPlayError("");
                }}
              >
                Close
              </Button>
            </div>
            {playError ? (
              <p className="bg-black px-4 py-8 text-center text-sm text-white/80">
                {playError}
              </p>
            ) : (
              <LessonVideo
                video={playing}
                onError={() =>
                  setPlayError(
                    "This copy cannot be played. Record the lesson again with Record, then Stop.",
                  )
                }
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
