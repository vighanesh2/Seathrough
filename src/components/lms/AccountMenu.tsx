"use client";

import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AccountMenuProps = {
  onLogin: () => void;
  onSignup?: () => void;
  onLogout?: () => void;
  variant?: "default" | "marketing";
};

export function AccountMenu({
  onLogin,
  onSignup,
  onLogout,
  variant = "default",
}: AccountMenuProps) {
  const { user, loading, logout } = useAuth();
  const marketing = variant === "marketing";

  if (loading) {
    return (
      <div
        className={cn(
          "size-9 animate-pulse rounded-full",
          marketing ? "bg-paper-deep" : "bg-secondary",
        )}
        aria-hidden
      />
    );
  }

  if (!user) {
    if (marketing) {
      return (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            onClick={onLogin}
            className="h-8 px-3 text-[13.5px] font-medium text-ink-soft hover:bg-paper-deep/70 hover:text-ink"
          >
            Log in
          </Button>
          {onSignup ? (
            <Button
              onClick={onSignup}
              className="h-8 rounded-[0.95rem] bg-accent px-3.5 text-[13.5px] font-medium text-white shadow-none hover:bg-accent-deep"
            >
              Get started
            </Button>
          ) : null}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        {onSignup ? (
          <Button variant="ghost" onClick={onSignup}>
            Sign up
          </Button>
        ) : null}
        <Button onClick={onLogin}>Log in</Button>
      </div>
    );
  }

  const initial = user.username.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="rounded-full"
          aria-label="Account"
        >
          <Avatar>
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <UserRound className="size-3.5" />
          {user.username}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void logout();
            onLogout?.();
          }}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
