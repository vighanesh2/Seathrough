"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useStudioAccess } from "@/components/site/StudioAccess";

export function MarketingHero() {
  const { openStudio } = useStudioAccess();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      video.pause();
      setPaused(true);
      return;
    }
    void video.play().catch(() => undefined);
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
      setPaused(false);
      return;
    }
    video.pause();
    setPaused(true);
  }

  return (
    <section className="bg-white">
      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-16 md:px-8 md:pt-24 md:pb-24">
        <h1 className="marketing-rise marketing-rise-1 max-w-3xl text-[2.6rem] leading-[1.08] font-medium tracking-[-0.035em] text-[#111111] sm:text-[3.25rem] md:text-[3.75rem]">
          Ask a question.
          <br />
          Watch and{" "}
          <span className="relative inline-block">
            learn.
            <svg
              className="draw-stroke pointer-events-none absolute -bottom-1 left-0 h-3 w-full sm:-bottom-2 sm:h-4"
              viewBox="0 0 120 16"
              aria-hidden
            >
              <path pathLength="1" d="M2 9 C 22 3, 40 14, 64 8 S 96 3, 118 10" />
            </svg>
          </span>
        </h1>
        <div className="marketing-rise marketing-rise-2 mt-8 flex flex-col items-start gap-6 sm:mt-10 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-sm text-[15px] leading-6 text-[#5c6370]">
            The tutor explains it with a visualization, talks through each
            step, then checks you understood.
          </p>
          <button
            type="button"
            onClick={() => openStudio("/smart-tutor")}
            className="inline-flex h-11 shrink-0 items-center bg-[#085080] px-5 text-[14px] font-medium text-white outline-none transition hover:bg-[#083068] focus-visible:ring-2 focus-visible:ring-[#085080]/40"
          >
            Try it out
          </button>
        </div>

        <div className="marketing-rise marketing-rise-3 mt-12 sm:mt-16">
          <p className="mb-3 text-center text-[15px] font-medium tracking-[-0.01em] text-[#111111]">
            Watch demo
          </p>
          <div className="bg-[#085080] p-6 sm:p-10 md:p-14">
          <div className="relative">
          <video
            ref={videoRef}
            src="/demovid.mp4"
            className="aspect-[1920/1166] w-full bg-[#111111] object-contain shadow-[0_24px_60px_-24px_rgba(8,12,40,0.55)]"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label="SeeThrough Smart tutor demo"
          />
          <button
            type="button"
            onClick={togglePlayback}
            className="absolute right-3 bottom-3 inline-flex size-9 items-center justify-center bg-white/90 text-[#111111] outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label={paused ? "Play demo" : "Pause demo"}
          >
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          </button>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
