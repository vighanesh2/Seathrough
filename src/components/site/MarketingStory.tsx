"use client";

import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useStudioAccess } from "@/components/site/StudioAccess";
import { stashPendingPrompt } from "@/lib/usage/pendingPrompt";
import type { ThreeScenePlan } from "@/lib/three-scenes/decide";
import { cn } from "@/lib/utils";

const ThreeBoard = dynamic(
  () =>
    import("@/components/board/ThreeBoard").then((m) => m.ThreeBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-60 items-center justify-center bg-board font-sans text-sm text-muted">
        Loading model…
      </div>
    ),
  },
);

const HEART_PLAN: ThreeScenePlan = {
  id: "cardiopulmonary",
  title: "Heart and lungs",
  maxReveal: 6,
  reveal: 6,
  params: { animationMode: "overview" },
};

const EYE_PLAN: ThreeScenePlan = {
  id: "eye",
  title: "Eye and vision",
  maxReveal: 6,
  reveal: 6,
  params: { animationMode: "overview" },
};

function useRevealOnScroll() {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

export function MarketingStory() {
  const { openStudio } = useStudioAccess();
  const anatomy = useRevealOnScroll();
  const cta = useRevealOnScroll();

  function open(question: string, href: string) {
    stashPendingPrompt(question, true);
    openStudio(href);
  }

  return (
    <>
      <section
        ref={anatomy.ref}
        className="border-t border-board-edge/80 bg-chalk/40 px-5 py-20 md:px-8 md:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <div
            className={cn(
              "marketing-reveal max-w-2xl",
              anatomy.visible && "is-in",
            )}
          >
            <p className="mb-4 text-[13px] font-medium text-accent">
              Turn the model
            </p>
            <h2 className="font-display text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] text-ink md:text-[2.55rem]">
              Anatomy you can hold with your cursor.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-ink-soft">
              Drag a heart or an eye in three dimensions. Follow one complete
              path — blood through the chambers, light through the lens — while
              the tutor names each part.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
            <div
              className={cn(
                "marketing-reveal marketing-reveal-delay-1",
                anatomy.visible && "is-in",
              )}
            >
              <FigureCard
                eyebrow="Heart & lungs"
                title="How blood moves through a beat"
                body="Watch the heart contract and the lungs fill. Point at a chamber or vessel, then ask what that part is doing."
                plan={HEART_PLAN}
              />
            </div>
            <div
              className={cn(
                "marketing-reveal marketing-reveal-delay-2",
                anatomy.visible && "is-in",
              )}
            >
              <FigureCard
                eyebrow="Eye & vision"
                title="How light becomes an image"
                body="Light enters from the left, bends through the cornea and lens, and lands on the retina. Turn the model to see the path."
                plan={EYE_PLAN}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              open("How does blood move through the heart?", "/3d-figures")
            }
            className={cn(
              "marketing-reveal mt-10 inline-flex items-center gap-2 border-b border-accent/35 pb-1 text-[14px] font-semibold text-accent transition hover:border-accent marketing-reveal-delay-3",
              anatomy.visible && "is-in",
            )}
          >
            Open 3D figures
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </section>

      <section ref={cta.ref} className="px-5 pt-4 pb-24 md:px-8 md:pb-32">
        <div
          className={cn(
            "marketing-cta-panel relative mx-auto max-w-6xl overflow-hidden rounded-[1.4rem] bg-ink px-6 py-14 text-center sm:px-10 md:py-20",
            cta.visible && "is-in",
          )}
        >
          <div className="marketing-cta-glow" aria-hidden />
          <p className="font-display relative mx-auto max-w-3xl text-[2.1rem] leading-[1.08] font-semibold tracking-[-0.03em] text-chalk sm:text-[2.75rem] md:text-[3.25rem]">
            You don’t need to know where to begin.
          </p>
          <p className="relative mx-auto mt-5 max-w-xl text-[15px] leading-7 text-sky-deep">
            Bring the confusing part. We’ll make it visible together.
          </p>
          <button
            type="button"
            onClick={() => openStudio("/lessons")}
            className="marketing-cta-button relative mt-8 inline-flex items-center gap-2 rounded-[0.95rem] bg-chalk px-6 py-3 text-[14px] font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-white"
          >
            Ask your first question
            <ArrowRight className="size-4" />
          </button>
        </div>
      </section>
    </>
  );
}

function FigureCard({
  eyebrow,
  title,
  body,
  plan,
}: {
  eyebrow: string;
  title: string;
  body: string;
  plan: ThreeScenePlan;
}) {
  return (
    <article className="marketing-figure-card overflow-hidden rounded-[1.4rem] border border-board-edge bg-chalk shadow-[0_24px_60px_-36px_rgba(26,43,60,0.3)]">
      <div className="relative h-[min(280px,42vh)] min-h-55 w-full overflow-hidden border-b border-board-edge bg-board">
        <ThreeBoard
          plan={plan}
          playing
          speed={1}
          showStructureControls={false}
          className="h-full w-full"
        />
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <p className="font-mono text-[10px] tracking-[0.12em] text-muted uppercase">
          {eyebrow}
        </p>
        <h3 className="mt-2 font-display text-[1.2rem] leading-snug font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h3>
        <p className="mt-2.5 text-[14px] leading-6 text-ink-soft">{body}</p>
      </div>
    </article>
  );
}
