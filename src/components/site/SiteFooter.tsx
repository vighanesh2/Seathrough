import Link from "next/link";
import { BrandMark } from "@/components/lms/BrandMark";
import { cn } from "@/lib/utils";

type SiteFooterProps = {
  variant?: "default" | "marketing";
};

/** Quiet footer — paper / ink tokens for marketing and product. */
export function SiteFooter({ variant = "default" }: SiteFooterProps) {
  const marketing = variant === "marketing";

  return (
    <footer
      className={cn(
        marketing ? "bg-transparent" : "border-t border-board-edge bg-chalk/80",
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 border-t border-board-edge px-5 py-10 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <BrandMark />
          <p className="mt-3 max-w-sm text-sm leading-6 text-ink-soft">
            SeeThrough draws the explanation so you can see the steps.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
          <Link href="/lessons" className="transition hover:text-ink">
            Topics
          </Link>
          <Link href="/scene-explain" className="transition hover:text-ink">
            3D scenes
          </Link>
          <Link href="/image-explain" className="transition hover:text-ink">
            Screenshots
          </Link>
        </div>
      </div>
    </footer>
  );
}
