import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
};

/** Full-viewport LMS frame used by every study mode. */
export function AppShell({ children, className }: AppShellProps) {
  return (
    <div
      className={cn(
        "flex h-dvh max-h-dvh w-full overflow-hidden bg-background text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
