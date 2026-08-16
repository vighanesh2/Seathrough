"use client";

import { LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
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
};

export function AccountMenu({ onLogin, onSignup, onLogout }: AccountMenuProps) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div
        className="size-8 animate-pulse rounded-full bg-secondary"
        aria-hidden
      />
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        {onSignup ? (
          <Button variant="ghost" size="sm" onClick={onSignup}>
            Sign up
          </Button>
        ) : null}
        <Button size="sm" onClick={onLogin}>
          Log in
        </Button>
      </div>
    );
  }

  const initial = user.username.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Account"
        >
          <Avatar size="sm">
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
