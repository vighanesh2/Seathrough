import type { ModeId } from "@/modes/types";
import { BrandMark } from "@/components/lms/BrandMark";
import { StudyMenu } from "@/components/modes/ModeNav";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  current?: ModeId;
  eyebrow?: string;
  title?: string;
  /** Left of the brand — e.g. reopen-chats control. */
  leading?: React.ReactNode;
  /** Extra controls before the study switcher. */
  actions?: React.ReactNode;
  account?: React.ReactNode;
  /** Full-width row under the toolbar (prompt bar, filters). */
  children?: React.ReactNode;
  className?: string;
};

export function AppHeader({
  current,
  eyebrow,
  title,
  leading,
  actions,
  account,
  children,
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "z-40 shrink-0 border-b border-border bg-card/90 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 md:gap-3 md:px-4">
        {leading}
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark />
          {eyebrow || title ? (
            <>
              <span
                className="hidden h-5 w-px bg-border sm:block"
                aria-hidden
              />
              <div className="hidden min-w-0 sm:block">
                {eyebrow ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                    {eyebrow}
                  </p>
                ) : null}
                {title ? (
                  <p className="truncate text-sm font-medium text-ink">{title}</p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {actions}
          <StudyMenu current={current} />
          {account}
        </div>
      </div>
      {children ? (
        <div className="border-t border-border/80 px-3 py-2.5 md:px-4">
          {children}
        </div>
      ) : null}
    </header>
  );
}
