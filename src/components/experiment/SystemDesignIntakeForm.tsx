"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SystemDesignIntake } from "@/lib/experiment/systemDesign/sections";
import type { IntakeAnswers } from "@/lib/experiment/systemDesign/sections";

type SystemDesignIntakeFormProps = {
  intake: SystemDesignIntake;
  prompt?: string;
  busy: boolean;
  error: string;
  onSubmit: (answers: IntakeAnswers) => void;
};

export function SystemDesignIntakeForm({
  intake,
  prompt = "",
  busy,
  error,
  onSubmit,
}: SystemDesignIntakeFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({
      who: values.who?.trim() ?? "",
      scale: values.scale?.trim() ?? "",
      dayOne: values.dayOne?.trim() ?? "",
      constraint: values.constraint?.trim() ?? "",
    });
  }

  return (
    <aside
      className="flex h-full min-h-0 w-full flex-col border-l border-board-edge bg-[#f4f8fb]"
      aria-label="System design questions"
    >
      <div className="shrink-0 px-4 pt-4 pb-2">
        <p className="text-[12px] font-medium text-muted">System design</p>
        <h2 className="mt-0.5 font-[family-name:var(--font-newsreader)] text-[1.15rem] tracking-tight text-ink">
          A few questions first
        </h2>
        {!prompt && intake.title ? (
          <p className="mt-1 line-clamp-3 text-[12px] leading-5 text-muted">
            {intake.title}
          </p>
        ) : null}
      </div>
      {prompt ? (
        <div className="shrink-0 px-4 pb-2">
          <p className="ml-auto max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[#085080] px-3 py-2 text-[14px] leading-6 text-white">
            {prompt}
          </p>
        </div>
      ) : null}
      <form
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
        onSubmit={submit}
      >
        {intake.questions.map((question) => (
          <label key={question.id} className="block text-[13px] text-ink">
            {question.prompt}
            <textarea
              value={values[question.id] ?? ""}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [question.id]: event.target.value,
                }))
              }
              placeholder={question.placeholder}
              disabled={busy}
              maxLength={400}
              rows={2}
              className="mt-1 w-full resize-none rounded-none border border-board-edge bg-white px-2 py-1.5 text-[13px] leading-5 text-ink outline-none"
            />
          </label>
        ))}
        {error ? (
          <p className="text-[12px] text-error" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy} className="mt-auto shrink-0">
          {busy ? "Designing…" : "Design the system"}
        </Button>
      </form>
    </aside>
  );
}
