"use client";

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
import { useSmoothNavigate } from "@/lib/navigation/smoothNavigate";
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
  const navigate = useSmoothNavigate();
  return (
    <DropdownMenuItem
      onSelect={(event) => {
        event.preventDefault();
        navigate(href);
      }}
      className={cn("cursor-pointer", current && "font-semibold text-accent-deep")}
      aria-current={current ? "page" : undefined}
    >
      <Icon className="size-4" />
      {label}
    </DropdownMenuItem>
  );
}

/** Switch what you’re learning — compact control for workspace chrome. */
export function StudyMenu({ current, className = "" }: StudyMenuProps) {
  const studios = listModesByGroup("studio");
  const more = listModesByGroup("more");
  const labs = listModesByGroup("lab");
  const active = current ? getMode(current) : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn("h-8 gap-1 px-2 text-[13px] font-medium", className)}
          aria-label="Start learning"
        >
          <span className="text-ink">{active?.navLabel ?? "Home"}</span>
          <ChevronDown className="size-3.5 text-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <ModeItem href="/" icon={House} label="Home" />
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Start learning</DropdownMenuLabel>
        {studios.map((mode) => (
          <ModeItem
            key={mode.id}
            href={mode.href}
            icon={MODE_UI[mode.id].icon}
            label={mode.navLabel}
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
