import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className, compact = false }: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg outline-none transition hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
      <img
        src="/SeeThrough_logo.png"
        alt=""
        className="h-8 w-8 shrink-0 object-contain"
      />
      {compact ? (
        <span className="sr-only">SeeThrough home</span>
      ) : (
        <span className="truncate font-display text-lg font-semibold tracking-tight text-ink md:text-xl">
          SeeThrough
        </span>
      )}
    </Link>
  );
}
