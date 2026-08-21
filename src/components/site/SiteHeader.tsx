"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";
import { listModesByGroup } from "@/modes/registry";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  variant?: "default" | "marketing";
};

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
      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 no-underline outline-none transition-colors hover:bg-[#f2f4f7] focus-visible:bg-[#f2f4f7]"
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eef4f9] text-[#1b6ca8]">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium tracking-[-0.01em] text-[#1a2b3c]">
          {title}
        </span>
        <span className="mt-0.5 block text-[13px] leading-5 text-[#6a7d90]">
          {hint}
        </span>
      </span>
    </Link>
  );
}

export function SiteHeader({ variant = "default" }: SiteHeaderProps) {
  const { openStudio, openAuth } = useStudioAccess();
  const [learnOpen, setLearnOpen] = useState(false);
  const studios = listModesByGroup("studio");
  const more = listModesByGroup("more");
  const labs = listModesByGroup("lab");
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
          ? "border-[#e6ebf0]/40 bg-[#fafbfc]/72 backdrop-blur-xl"
          : "border-border/80 bg-glass backdrop-blur-md",
      )}
    >
      <div
        className={cn(
          "mx-auto flex items-center",
          marketing
            ? "h-14 max-w-5xl px-5 md:px-6"
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
                    ? "bg-[#eef2f6] text-[#1a2b3c]"
                    : "text-[#3d5166] hover:bg-[#f2f4f7] hover:text-[#1a2b3c]",
                )}
              >
                Learn
                <ChevronDown
                  className={cn(
                    "size-3.5 text-[#6a7d90] transition duration-200",
                    learnOpen && "rotate-180",
                  )}
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={10}
              collisionPadding={16}
              className="w-88 rounded-xl border-[#e6ebf0] p-1.5 shadow-[0_12px_40px_-12px_rgba(26,43,60,0.18)]"
            >
              <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-[0.06em] text-[#8a9aab] uppercase">
                Tools
              </p>
              <div className="flex flex-col">
                {studios.map((mode) => (
                  <LearnRow
                    key={mode.id}
                    href={mode.href}
                    title={mode.navLabel}
                    hint={MODE_UI[mode.id].hint}
                    icon={MODE_UI[mode.id].icon}
                    onPick={pick}
                  />
                ))}
              </div>

              {more.length > 0 ? (
                <>
                  <Separator className="my-1.5 bg-[#e6ebf0]" />
                  <p className="px-3 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.06em] text-[#8a9aab] uppercase">
                    More
                  </p>
                  <div className="flex flex-col">
                    {more.map((mode) => (
                      <LearnRow
                        key={mode.id}
                        href={mode.href}
                        title={mode.title}
                        hint={MODE_UI[mode.id].hint}
                        icon={MODE_UI[mode.id].icon}
                        onPick={pick}
                      />
                    ))}
                  </div>
                </>
              ) : null}

              {labs.length > 0 ? (
                <>
                  <Separator className="my-1.5 bg-[#e6ebf0]" />
                  <p className="px-3 pt-1.5 pb-1 text-[11px] font-medium tracking-[0.06em] text-[#8a9aab] uppercase">
                    Labs
                  </p>
                  <div className="flex flex-col">
                    {labs.map((mode) => (
                      <LearnRow
                        key={mode.id}
                        href={mode.href}
                        title={mode.title}
                        hint={MODE_UI[mode.id].hint}
                        icon={MODE_UI[mode.id].icon}
                        onPick={pick}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </PopoverContent>
          </Popover>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-[#3d5166] hover:bg-[#f2f4f7] md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100%,20rem)] p-0">
              <SheetHeader className="border-b border-[#e6ebf0] px-5 py-4">
                <SheetTitle className="text-[15px] font-medium">Learn</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col p-2">
                <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-[0.06em] text-[#8a9aab] uppercase">
                  Tools
                </p>
                {studios.map((mode) => {
                  const Icon = MODE_UI[mode.id].icon;
                  return (
                    <SheetClose asChild key={mode.id}>
                      <button
                        type="button"
                        onClick={() => openStudio(mode.href)}
                        className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#f2f4f7]"
                      >
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eef4f9] text-[#1b6ca8]">
                          <Icon className="size-4" />
                        </span>
                        <span>
                          <span className="block text-[14px] font-medium text-[#1a2b3c]">
                            {mode.navLabel}
                          </span>
                          <span className="mt-0.5 block text-[12px] font-normal text-[#6a7d90]">
                            {MODE_UI[mode.id].hint}
                          </span>
                        </span>
                      </button>
                    </SheetClose>
                  );
                })}
                <Separator className="my-2 bg-[#e6ebf0]" />
                <p className="px-3 pt-1 pb-1 text-[11px] font-medium tracking-[0.06em] text-[#8a9aab] uppercase">
                  More
                </p>
                {more.map((mode) => {
                  const Icon = MODE_UI[mode.id].icon;
                  return (
                    <SheetClose asChild key={mode.id}>
                      <button
                        type="button"
                        onClick={() => openStudio(mode.href)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#f2f4f7]"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#eef4f9] text-[#1b6ca8]">
                          <Icon className="size-4" />
                        </span>
                        <span className="text-[14px] text-[#1a2b3c]">
                          {mode.title}
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
