"use client";

import Link from "next/link";
import { ChevronDown, House } from "lucide-react";
import { getMode, listModesByGroup } from "@/modes/registry";
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

/** Switch between studios — compact control for workspace chrome. */
export function StudyMenu({ current, className = "" }: StudyMenuProps) {
  const studios = listModesByGroup("studio");
  const more = listModesByGroup("more");
  const labs = listModesByGroup("lab");
  const active = current ? getMode(current) : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("gap-1.5 font-medium", className)}
          aria-label="Switch studio"
        >
          <span className="text-muted">Studio</span>
          <span className="text-ink">{active?.navLabel ?? "Home"}</span>
          <ChevronDown className="size-3.5 text-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <ModeItem href="/" icon={House} label="Home" />
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Studios</DropdownMenuLabel>
        {studios.map((mode) => (
          <ModeItem
            key={mode.id}
            href={mode.href}
            icon={MODE_UI[mode.id].icon}
            label={mode.title}
            current={mode.id === current}
          />
        ))}
        {more.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>More</DropdownMenuLabel>
            {more.map((mode) => (
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
        {labs.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Labs</DropdownMenuLabel>
            {labs.map((mode) => (
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
