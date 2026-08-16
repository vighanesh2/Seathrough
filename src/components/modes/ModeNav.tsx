"use client";

import Link from "next/link";
import { ChevronDown, House } from "lucide-react";
import { getMode, listEnabledModes } from "@/modes/registry";
import type { ModeId } from "@/modes/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MODE_UI } from "@/components/lms/modeUi";
import { cn } from "@/lib/utils";

type StudyMenuProps = {
  current?: ModeId;
  className?: string;
};

function ModeItem({
  href,
  icon: Icon,
  label,
  current,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  current?: boolean;
}) {
  return (
    <DropdownMenuItem asChild>
      <Link
        href={href}
        aria-current={current ? "page" : undefined}
        className={cn("cursor-pointer", current && "font-semibold text-accent-deep")}
      >
        <Icon className="size-4" />
        {label}
      </Link>
    </DropdownMenuItem>
  );
}

/**
 * One control to switch study modes — Canvas/Quizlet style, not a chip row.
 */
export function StudyMenu({ current, className = "" }: StudyMenuProps) {
  const learning = listEnabledModes("learning");
  const tools = listEnabledModes("tool");
  const active = current ? getMode(current) : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("gap-1.5 font-medium", className)}
          aria-label="Switch study tool"
        >
          <span className="text-muted">Study</span>
          <span className="text-ink">{active?.navLabel ?? "Home"}</span>
          <ChevronDown className="size-3.5 text-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <ModeItem href="/" icon={House} label="Home" />
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Study</DropdownMenuLabel>
        {learning.map((mode) => (
          <ModeItem
            key={mode.id}
            href={mode.href}
            icon={MODE_UI[mode.id].icon}
            label={mode.title}
            current={mode.id === current}
          />
        ))}
        {tools.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Labs</DropdownMenuLabel>
            {tools.map((mode) => (
              <ModeItem
                key={mode.id}
                href={mode.href}
                icon={MODE_UI[mode.id].icon}
                label={mode.title}
                current={mode.id === current}
              />
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** @deprecated Prefer StudyMenu — kept so old imports keep working. */
export { StudyMenu as ModeNav };
