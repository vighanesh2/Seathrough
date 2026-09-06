"use client";

import { ArrowRight, Box, HeartPulse, Image, PencilLine } from "lucide-react";
import { useStudioAccess } from "@/components/site/StudioAccess";
import { stashPendingPrompt } from "@/lib/usage/pendingPrompt";

const QUESTIONS = [
  {
    question: "What does a derivative actually mean?",
    answer: "Watch the slope change as the point moves.",
    href: "/lessons",
    icon: PencilLine,
    number: "01",
  },
  {
    question: "How does blood move through the heart?",
    answer: "Turn the model and follow one complete trip.",
    href: "/3d-figures",
    icon: HeartPulse,
    number: "02",
  },
  {
    question: "Why doesn’t the moon fly away?",
    answer: "Build the orbit, then watch gravity bend it.",
    href: "/scene-explain",
    icon: Box,
    number: "03",
  },
  {
    question: "What is this diagram trying to say?",
    answer: "Upload it and unpack every part together.",
    href: "/image-explain",
    icon: Image,
    number: "04",
  },
] as const;

export function MarketingStory() {
  const { openStudio } = useStudioAccess();

  function open(question: string, href: string) {
    stashPendingPrompt(question, true);
    openStudio(href);
  }

  return (
    <>
      <section className="border-y border-[#cbdbe6]/75 bg-white/38 px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-24">
            <div>
              <p className="text-[2rem] leading-[1.08] font-semibold tracking-[-0.045em] text-[#17324a] md:text-[2.6rem]">
                Learning should feel like someone pulled up a chair.
              </p>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#5c7386]">
                No menus to study. No special prompts to learn. Begin with the
                question already in your head.
              </p>
            </div>

            <div className="divide-y divide-[#ccdae5] border-y border-[#ccdae5]">
              {QUESTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.number}
                    type="button"
                    onClick={() => open(item.question, item.href)}
                    className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-start gap-4 py-6 text-left outline-none transition hover:pl-2 focus-visible:bg-white/65 md:grid-cols-[3rem_1fr_auto] md:py-8"
                  >
                    <span className="pt-1 font-mono text-[11px] text-[#8a9dac]">
                      {item.number}
                    </span>
                    <span>
                      <span className="block text-[1rem] font-medium tracking-[-0.015em] text-[#17324a] md:text-[1.12rem]">
                        {item.question}
                      </span>
                      <span className="mt-1.5 block text-[13.5px] leading-6 text-[#61788b]">
                        {item.answer}
                      </span>
                    </span>
                    <span className="mt-0.5 grid size-10 place-items-center rounded-full border border-[#cbdbe6] text-[#1b6ca8] transition group-hover:border-[#1b6ca8] group-hover:bg-[#1b6ca8] group-hover:text-white">
                      <Icon className="size-4" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-24 md:px-8 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <VisualLesson />
            <div className="max-w-lg">
              <p className="mb-5 text-[13px] font-medium text-[#1b6ca8]">
                Not another wall of text
              </p>
              <h2 className="text-[2.75rem] leading-none font-semibold tracking-[-0.06em] text-[#17324a] sm:text-[3.4rem]">
                See each idea arrive at the right moment.
              </h2>
              <p className="mt-6 text-[16px] leading-8 text-[#5c7386]">
                The picture grows with the explanation. You can pause it, turn
                it and point at any part. Then ask the next question just like
                you would with a patient teacher.
              </p>
              <button
                type="button"
                onClick={() =>
                  open("What does a derivative actually mean?", "/lessons")
                }
                className="mt-8 inline-flex items-center gap-2 border-b border-[#1b6ca8]/35 pb-1 text-[14px] font-semibold text-[#1b6ca8] transition hover:border-[#1b6ca8]"
              >
                Try a visual lesson
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 md:px-8 md:pb-32">
        <div className="mx-auto max-w-6xl rounded-[2rem] bg-[#17324a] px-6 py-14 text-center text-white sm:px-10 md:py-20">
          <p className="mx-auto max-w-3xl text-[2.25rem] leading-[1.02] font-semibold tracking-[-0.055em] sm:text-[3rem] md:text-[3.7rem]">
            You don’t need to know where to begin.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-[#bfd1df]">
            Bring the confusing part. We’ll make it visible together.
          </p>
          <button
            type="button"
            onClick={() => openStudio("/lessons")}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#e8f2f8] px-6 py-3 text-[14px] font-semibold text-[#17324a] transition hover:-translate-y-0.5 hover:bg-white"
          >
            Ask your first question
            <ArrowRight className="size-4" />
          </button>
        </div>
      </section>
    </>
  );
}

function VisualLesson() {
  return (
    <div className="relative mx-auto w-full max-w-136">
      <div className="absolute -inset-8 rounded-full bg-[#a9cee6]/25 blur-3xl" />
      <div className="relative rotate-[-1.5deg] rounded-[1.75rem] border border-[#c7d8e4] bg-[#fbfdff] p-5 shadow-[0_25px_70px_-42px_rgba(23,50,74,0.42)] sm:p-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.12em] text-[#8295a5] uppercase">
              Visual lesson, step 3 of 4
            </p>
            <p className="mt-2 text-[15px] font-semibold text-[#17324a]">
              The derivative is a changing slope
            </p>
          </div>
          <span className="size-2.5 rounded-full bg-[#2a7a5c]" />
        </div>
        <svg viewBox="0 0 520 310" className="mt-6 w-full" aria-hidden>
          {Array.from({ length: 11 }, (_, i) => (
            <line
              key={`h-${i}`}
              x1="0"
              x2="520"
              y1={i * 31}
              y2={i * 31}
              stroke="rgba(27,108,168,.07)"
            />
          ))}
          {Array.from({ length: 18 }, (_, i) => (
            <line
              key={`v-${i}`}
              y1="0"
              y2="310"
              x1={i * 31}
              x2={i * 31}
              stroke="rgba(27,108,168,.07)"
            />
          ))}
          <path
            d="M34 252 C 96 252 125 242 160 208 C 205 165 230 68 308 65 C 377 63 390 210 488 228"
            fill="none"
            stroke="#1b6ca8"
            strokeWidth="4"
            strokeLinecap="round"
            className="animate-stroke-draw"
          />
          <line
            x1="188"
            y1="205"
            x2="332"
            y2="86"
            stroke="#c45e1a"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="260" cy="146" r="7" fill="#c45e1a" />
          <path
            d="M346 74 C 372 62 396 62 420 71"
            fill="none"
            stroke="#c45e1a"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <text
            x="357"
            y="49"
            fontFamily="ui-sans-serif, system-ui"
            fontSize="13"
            fill="#9b4c16"
          >
            tangent line
          </text>
        </svg>
        <p className="mt-4 border-l-2 border-[#1b6ca8] pl-4 text-[13.5px] leading-6 text-[#52697d]">
          Move the point and the line turns with it. Its steepness is the
          derivative at that exact place.
        </p>
      </div>
      <span className="absolute -right-3 -bottom-4 rotate-2 rounded-xl bg-[#d8ebf6] px-4 py-2 text-[14px] font-semibold text-[#17324a] shadow-sm">
        Now it makes sense
      </span>
    </div>
  );
}
