"use client";

type PromptBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export function PromptBar({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Ask a concept… e.g. explain what a class is in Java",
}: PromptBarProps) {
  return (
    <form
      className="flex w-full items-stretch gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
    >
      <label className="sr-only" htmlFor="lesson-prompt">
        Lesson prompt
      </label>
      <div className="relative flex-1">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-muted"
        >
          ›
        </span>
        <input
          id="lesson-prompt"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="h-12 w-full rounded-xl border border-[var(--hairline)] bg-chalk pl-7 pr-3 font-sans text-sm text-ink outline-none ring-accent/30 transition placeholder:text-muted focus:ring-2 disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="h-12 shrink-0 rounded-xl bg-ink px-5 font-sans text-sm font-semibold text-chalk transition hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        Teach
      </button>
    </form>
  );
}
