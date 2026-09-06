import Link from "next/link";
import { BrandMark } from "@/components/lms/BrandMark";
import { cn } from "@/lib/utils";

type SiteFooterProps = {
  variant?: "default" | "marketing";
};

/** Quiet footer — matches the new light chrome. Full pass later. */
export function SiteFooter({ variant = "default" }: SiteFooterProps) {
  const marketing = variant === "marketing";

  return (
    <footer
      className={cn(
        marketing
          ? "bg-transparent"
          : "border-t border-board-edge bg-chalk/80",
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 border-t border-[#cbdbe6] px-5 py-10 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <BrandMark />
          <p
            className={cn(
              "mt-3 max-w-sm text-sm leading-6",
              marketing ? "text-[#6a7d90]" : "text-ink-soft",
            )}
          >
            SeeThrough draws the explanation so you can see the steps.
          </p>
        </div>
        <div
          className={cn(
            "flex flex-wrap gap-x-5 gap-y-2 text-sm",
            marketing ? "text-[#6a7d90]" : "text-ink-soft",
          )}
        >
          <Link href="/lessons" className="hover:text-[#1a2b3c]">
            Topics
          </Link>
          <Link href="/scene-explain" className="hover:text-[#1a2b3c]">
            3D scenes
          </Link>
          <Link href="/image-explain" className="hover:text-[#1a2b3c]">
            Screenshots
          </Link>
        </div>
      </div>
    </footer>
  );
}
