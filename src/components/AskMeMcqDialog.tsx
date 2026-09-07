"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toUserFacingError } from "@/lib/errors/userFacing";
import type { LessonMcq } from "@/lib/schemas/mcq";
import { cn } from "@/lib/utils";

type AskMeMcqDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  title?: string;
  narrationLines: string[];
};

type LoadState = "idle" | "loading" | "ready" | "error";

export function AskMeMcqDialog({
  open,
  onOpenChange,
  conversationId,
  title,
  narrationLines,
}: AskMeMcqDialogProps) {
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [mcq, setMcq] = useState<LessonMcq | null>(null);
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
  const askedRef = useRef<string[]>([]);
  const fetchSeq = useRef(0);

  const fetchQuestion = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoadState("loading");
    setError(null);
    setMcq(null);
    setChoiceIndex(null);

    try {
      const res = await fetch("/api/lesson/mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          title,
          narration: narrationLines.slice(-20),
          excludeQuestions: askedRef.current.slice(-8),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        mcq?: LessonMcq;
        error?: string;
      };

      if (seq !== fetchSeq.current) return;

      if (!res.ok || !data.mcq) {
        throw new Error(data.error || "Couldn't create a question right now.");
      }

      askedRef.current = [...askedRef.current, data.mcq.question].slice(-12);
      setMcq(data.mcq);
      setLoadState("ready");
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      setError(toUserFacingError(err));
      setLoadState("error");
    }
  }, [conversationId, title, narrationLines]);

  useEffect(() => {
    if (!open) return;
    void fetchQuestion();
    return () => {
      fetchSeq.current += 1;
    };
    // Intentionally fetch once per open; "Another question" calls fetchQuestion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const answered = choiceIndex !== null && mcq !== null;
  const isCorrect = answered && choiceIndex === mcq.correctIndex;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Quick check</DialogTitle>
          <DialogDescription>
            A short question from this lesson. Pick one answer.
          </DialogDescription>
        </DialogHeader>

        {loadState === "loading" ? (
          <p className="py-8 text-center text-sm text-[#8a9aab]">
            Writing a question…
          </p>
        ) : null}

        {loadState === "error" ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-[#c45c4a]">
              {error ?? "Something went wrong. Please try again."}
            </p>
            <Button type="button" variant="outline" onClick={() => void fetchQuestion()}>
              Try again
            </Button>
          </div>
        ) : null}

        {loadState === "ready" && mcq ? (
          <div className="space-y-4">
            <p className="text-[15px] font-medium leading-6 tracking-[-0.01em] text-[#1a2b3c]">
              {mcq.question}
            </p>
            <div className="flex flex-col gap-2">
              {mcq.options.map((option, index) => {
                const selected = choiceIndex === index;
                const showResult = answered;
                const optionCorrect = index === mcq.correctIndex;
                return (
                  <button
                    key={`${index}-${option.slice(0, 24)}`}
                    type="button"
                    disabled={answered}
                    onClick={() => setChoiceIndex(index)}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left text-[13.5px] leading-5 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-[#1b6ca8]/30 disabled:cursor-default sm:text-[14px]",
                      !showResult &&
                        "border-[#e6ebf0] bg-white text-[#3d5166] hover:border-[#c8d6e4] hover:bg-[#f7f9fb]",
                      showResult &&
                        optionCorrect &&
                        "border-[#2a7a5c]/40 bg-[#eaf6f0] text-[#1a2b3c]",
                      showResult &&
                        selected &&
                        !optionCorrect &&
                        "border-[#c45c4a]/35 bg-[#fdf0ed] text-[#1a2b3c]",
                      showResult &&
                        !selected &&
                        !optionCorrect &&
                        "border-[#eef2f6] bg-[#fafbfc] text-[#8a9aab]",
                    )}
                  >
                    <span className="mr-2 font-medium text-[#8a9aab]">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>

            {answered ? (
              <div
                className={cn(
                  "rounded-xl px-3.5 py-3 text-[13.5px] leading-5",
                  isCorrect
                    ? "bg-[#eaf6f0] text-[#2a7a5c]"
                    : "bg-[#fdf0ed] text-[#c45c4a]",
                )}
              >
                <p className="font-medium">
                  {isCorrect ? "Correct" : "Not quite"}
                </p>
                <p className="mt-1 text-[#3d5166]">{mcq.explanation}</p>
              </div>
            ) : (
              <p className="text-center text-[13px] text-[#8a9aab]">
                Pick the best answer.
              </p>
            )}
          </div>
        ) : null}

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={loadState === "loading"}
            onClick={() => void fetchQuestion()}
          >
            Another question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
