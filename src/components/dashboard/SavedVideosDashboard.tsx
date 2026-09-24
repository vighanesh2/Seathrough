"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Play, Trash2 } from "lucide-react";
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
                  {video.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.posterUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-[13px] text-muted">
                      {video.title}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-[#1a2b3c]/15">
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
            <div className="flex items-center justify-between gap-3 bg-white px-4 py-3">
              <p className="truncate text-[15px] font-medium text-[#111111]">
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
              <video
                key={playing.id}
                poster={playing.posterUrl}
                controls
                autoPlay
                playsInline
                preload="auto"
                className="max-h-[70vh] w-full bg-black"
                onError={() =>
                  setPlayError(
                    "This copy cannot be played. Record the lesson again with Record, then Stop.",
                  )
                }
              >
                <source
                  src={playing.videoUrl}
                  type={playing.mimeType || "video/webm"}
                />
              </video>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
