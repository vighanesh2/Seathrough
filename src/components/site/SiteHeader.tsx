"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { BrandMark } from "@/components/lms/BrandMark";
import { MODE_UI } from "@/components/lms/modeUi";
import { useStudioAccess } from "@/components/site/StudioAccess";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  variant?: "default" | "marketing";
};

const LEARN_ITEMS = [
  {
    href: "/lessons",
    title: "Learn a lesson",
    hint: "Ask what you’re stuck on. We’ll draw it step by step.",
    icon: MODE_UI.lessons.icon,
  },
  {
    href: "/scene-explain",
    title: "3D scene",
    hint: "Ask for orbits, cells, anything — a 3D scene builds and explains it.",
    icon: MODE_UI["scene-explain"].icon,
  },
  {
    href: "/3d-figures",
    title: "Human anatomy",
    hint: "Turn a heart, lung, or eye. Then ask what a part does.",
    icon: MODE_UI["figures-3d"].icon,
  },
] as const;

/** Plain organized row — Notion structure, Perplexity calm. */
function LearnRow({
  href,
  title,
  hint,
  icon: Icon,
  onPick,
}: {
  href: string;
  title: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  onPick: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onPick(href);
      }}
      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 no-underline outline-none transition-colors hover:bg-paper-deep/70 focus-visible:bg-paper-deep/70"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium tracking-[-0.01em] text-ink">
          {title}
        </span>
        <span className="mt-0.5 block text-[13px] leading-5 text-muted">
          {hint}
        </span>
      </span>
    </Link>
  );
}

export function SiteHeader({ variant = "default" }: SiteHeaderProps) {
  const { openStudio, openAuth } = useStudioAccess();
  const [learnOpen, setLearnOpen] = useState(false);
  const marketing = variant === "marketing";

  function pick(href: string) {
    setLearnOpen(false);
    openStudio(href);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b",
        marketing
          ? "border-board-edge/60 bg-paper/80 backdrop-blur-xl"
          : "border-border/80 bg-glass backdrop-blur-md",
      )}
    >
      <div
        className={cn(
          "mx-auto flex items-center",
          marketing
            ? "h-16 max-w-6xl px-5 md:px-8"
            : "min-h-16 max-w-7xl gap-6 px-5 py-2.5 lg:px-10",
        )}
      >
        <BrandMark size="sm" />

        {/* Desktop: one Learn menu + nothing else in the middle */}
        <nav
          className="ml-8 hidden items-center gap-1 md:flex"
          aria-label="Primary"
        >
          <Popover open={learnOpen} onOpenChange={setLearnOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-[13.5px] font-medium tracking-[-0.01em] outline-none transition-colors",
                  learnOpen
                    ? "bg-paper-deep text-ink"
                    : "text-ink-soft hover:bg-paper-deep/70 hover:text-ink",
                )}
              >
                Learn
                <ChevronDown
                  className={cn(
                    "size-3.5 text-muted transition duration-200",
                    learnOpen && "rotate-180",
                  )}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={10}
              collisionPadding={16}
              className="w-88 rounded-xl border-board-edge p-1.5 shadow-[0_12px_40px_-12px_rgba(26,43,60,0.18)]"
            >
              <div className="flex flex-col">
                {LEARN_ITEMS.map((item) => (
                  <LearnRow
                    key={item.href}
                    href={item.href}
                    title={item.title}
                    hint={item.hint}
                    icon={item.icon}
                    onPick={pick}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-ink-soft hover:bg-paper-deep/70 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,20rem)] p-0">
              <SheetHeader className="border-b border-board-edge px-5 py-4">
                <SheetTitle className="text-[15px] font-medium">Learn</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col p-2">
                {LEARN_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SheetClose asChild key={item.href}>
                      <button
                        type="button"
                        onClick={() => openStudio(item.href)}
                        className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-paper-deep/70"
                      >
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                          <Icon className="size-4" />
                        </span>
                        <span>
                          <span className="block text-[14px] font-medium text-ink">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-[12px] font-normal text-muted">
                            {item.hint}
                          </span>
                        </span>
                      </button>
                    </SheetClose>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>

          <AccountMenu
            variant={marketing ? "marketing" : "default"}
            onLogin={() => openAuth("login")}
            onSignup={() => openAuth("signup")}
          />
        </div>
      </div>
    </header>
  );
}
