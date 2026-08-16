"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
  /** When true, modal cannot be dismissed without signing in */
  required?: boolean;
};

export function AuthModal({
  open,
  onClose,
  initialMode = "login",
  required = false,
}: AuthModalProps) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const err =
      mode === "login"
        ? await login(username, password)
        : await signup(username, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setUsername("");
    setPassword("");
    onClose();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy && !required) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!required}
        className="max-w-md sm:max-w-md"
        onPointerDownOutside={(event) => {
          if (required || busy) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (required || busy) event.preventDefault();
        }}
      >
        <DialogHeader className="items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img
            src="/SeeThrough_logo.png"
            alt=""
            className="mb-1 h-16 w-auto object-contain"
          />
          <DialogTitle className="font-display text-2xl">
            {mode === "login" ? "Log in" : "Create an account"}
          </DialogTitle>
          <DialogDescription>
            {required
              ? "Sign in to open your whiteboard and private lesson chats."
              : "Save lessons to this device’s account."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-username">Username</Label>
            <Input
              id="auth-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={busy}
              placeholder="e.g. alex"
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              disabled={busy}
              placeholder="At least 6 characters"
              className="h-11"
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={busy || !username.trim() || !password}
            className="mt-1 w-full"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button
                type="button"
                className="font-semibold text-accent hover:underline"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="font-semibold text-accent hover:underline"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Log in
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
