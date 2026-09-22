"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RecursionPlay } from "@/components/ai-tutor/RecursionPlay";

const LANGUAGES = ["Python", "JavaScript", "Java"] as const;

type Step = "topic" | "language" | "explain" | "practice";

function langKey(name: string) {
  const n = name.trim().toLowerCase();
  if (["js", "javascript", "node", "nodejs", "node.js"].includes(n)) {
    return "javascript" as const;
  }
  if (["py", "python"].includes(n)) return "python" as const;
  if (n === "java") return "java" as const;
  return "generic" as const;
}

function countdownCode(language: string) {
  switch (langKey(language)) {
    case "javascript":
      return `function countdown(n) {
  if (n === 0) return;
  console.log(n);
  countdown(n - 1);
}`;
    case "java":
      return `void countdown(int n) {
    if (n == 0) return;
    System.out.println(n);
    countdown(n - 1);
}`;
    case "python":
      return `def countdown(n):
    if n == 0:
        return
    print(n)
    countdown(n - 1)`;
    default:
      return `countdown(n):
    if n is 0: stop
    print n
    countdown(n - 1)`;
  }
}

function factorialCode(language: string) {
  switch (langKey(language)) {
    case "javascript":
      return `function factorial(n) {
  if (n === 1) return 1;
  return n * factorial(n - 1);
}`;
    case "java":
      return `int factorial(int n) {
    if (n == 1) return 1;
    return n * factorial(n - 1);
}`;
    case "python":
      return `def factorial(n):
    if n == 1:
        return 1
    return n * factorial(n - 1)`;
    default:
      return `factorial(n):
    if n is 1: return 1
    return n * factorial(n - 1)`;
  }
}

function CodeCard({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-board-edge bg-[#f7fafc] px-5 py-4 font-mono text-[13px] leading-6 text-ink shadow-[0_10px_28px_rgba(26,43,60,0.05)]">
      <code>{code}</code>
    </pre>
  );
}

function Screen({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={
        wide
          ? "relative w-full max-w-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300"
          : "relative w-full max-w-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300"
      }
    >
      {children}
    </div>
  );
}

export function TutorMockup() {
  const [step, setStep] = useState<Step>("topic");
  const [topic, setTopic] = useState("");
  const [customLanguage, setCustomLanguage] = useState("");
  const [chosenLanguage, setChosenLanguage] = useState("");
  const topicRef = useRef<HTMLTextAreaElement>(null);
  const customRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "topic") topicRef.current?.focus();
  }, [step]);

  function goToLanguage() {
    if (!topic.trim()) return;
    setCustomLanguage("");
    setStep("language");
  }

  function goToExplain(name: string) {
    const next = name.trim();
    if (!next) return;
    setChosenLanguage(next);
    setStep("explain");
  }

  function pickLanguage(name: string) {
    setCustomLanguage("");
    goToExplain(name);
  }

  function submitCustomLanguage() {
    goToExplain(customLanguage);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <main className="relative flex flex-1 items-center justify-center overflow-y-auto px-4 py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,rgba(27,108,168,0.10),transparent_55%)]"
        />

        {step === "topic" ? (
          <Screen>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                goToLanguage();
              }}
            >
              <h1 className="font-[family-name:var(--font-newsreader)] text-center text-[2.15rem] leading-tight tracking-tight text-ink sm:text-[2.6rem]">
                What do you want to learn?
              </h1>

              <div className="mt-8 rounded-2xl border border-board-edge bg-white/95 p-2 shadow-[0_18px_40px_rgba(26,43,60,0.07)]">
                <label htmlFor="tutor-mockup-topic" className="sr-only">
                  Topic to learn
                </label>
                <Textarea
                  id="tutor-mockup-topic"
                  ref={topicRef}
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      goToLanguage();
                    }
                  }}
                  placeholder="what is recursion in programming"
                  className="min-h-[96px] resize-none border-0 bg-transparent px-3 py-3 text-[16px] shadow-none focus-visible:ring-0"
                />
              </div>
              <p className="mt-3 text-center text-[12px] text-muted">
                Enter to continue
              </p>
            </form>
          </Screen>
        ) : null}

        {step === "language" ? (
          <Screen>
            <h1 className="font-[family-name:var(--font-newsreader)] text-center text-[2.15rem] leading-tight tracking-tight text-ink sm:text-[2.6rem]">
              Which programming language do you use to code?
            </h1>

            <div className="mt-8 space-y-3">
              {LANGUAGES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => pickLanguage(name)}
                  className="flex w-full items-center rounded-2xl border border-board-edge bg-white/95 px-5 py-4 text-left text-[16px] text-ink shadow-[0_10px_28px_rgba(26,43,60,0.05)] transition-colors outline-none hover:border-accent/50 hover:bg-white focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {name}
                </button>
              ))}

              <form
                className="rounded-2xl border border-board-edge bg-white/95 p-2 shadow-[0_10px_28px_rgba(26,43,60,0.05)]"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitCustomLanguage();
                }}
              >
                <label htmlFor="tutor-mockup-language" className="sr-only">
                  Another language
                </label>
                <input
                  id="tutor-mockup-language"
                  ref={customRef}
                  value={customLanguage}
                  onChange={(event) => setCustomLanguage(event.target.value)}
                  placeholder="Or type another language…"
                  className="h-12 w-full bg-transparent px-3 text-[16px] text-ink outline-none placeholder:text-muted"
                />
              </form>
            </div>
          </Screen>
        ) : null}

        {step === "explain" ? (
          <Screen>
            <p className="text-center text-[12px] font-medium tracking-[0.08em] text-muted uppercase">
              {chosenLanguage}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-newsreader)] text-center text-[2.15rem] leading-tight tracking-tight text-ink sm:text-[2.6rem]">
              Recursion is a function that calls itself
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-center text-[16px] leading-7 text-ink-soft">
              It solves a smaller copy of the same problem, then uses that
              answer. Two parts have to be there: a base case that stops, and a
              recursive case that makes the input smaller.
            </p>

            <div className="mx-auto mt-6 max-w-sm space-y-2">
              <div className="rounded-xl border border-board-edge bg-white px-4 py-3 text-sm text-ink">
                countdown(3) prints 3, then calls countdown(2)
              </div>
              <div className="ml-4 rounded-xl border border-board-edge bg-white px-4 py-3 text-sm text-ink">
                countdown(2) prints 2, then calls countdown(1)
              </div>
              <div className="ml-8 rounded-xl border border-board-edge bg-white px-4 py-3 text-sm text-ink">
                countdown(1) prints 1, then calls countdown(0)
              </div>
              <div className="ml-12 rounded-xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-ink">
                countdown(0) hits the base case and stops
              </div>
            </div>

            <div className="mt-6">
              <CodeCard code={countdownCode(chosenLanguage)} />
            </div>

            <div className="mt-8 flex justify-center">
              <Button type="button" onClick={() => setStep("practice")}>
                Watch it happen
              </Button>
            </div>
          </Screen>
        ) : null}

        {step === "practice" ? (
          <Screen wide>
            <RecursionPlay code={factorialCode(chosenLanguage)} quiz />
          </Screen>
        ) : null}
      </main>
    </div>
  );
}
