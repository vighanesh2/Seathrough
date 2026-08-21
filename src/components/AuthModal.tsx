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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
  /** When true, modal cannot be dismissed without signing in */
  required?: boolean;
  /** Copy for the free daily question limit */
  quotaExhausted?: boolean;
  onSuccess?: () => void;
};

export function AuthModal({
  open,
  onClose,
  initialMode = "login",
  required = false,
  quotaExhausted = false,
  onSuccess,
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
    onSuccess?.();
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
            className="mb-1 h-14 w-auto object-contain"
          />
          <DialogTitle className="font-display text-2xl">
            {quotaExhausted
              ? "Sign in to keep going"
              : required
                ? "Sign in to continue"
                : "Your account"}
          </DialogTitle>
          <DialogDescription>
            {quotaExhausted
              ? "You've used today's 5 free questions. Sign in or create an account for unlimited access — the limit resets tomorrow if you stay signed out."
              : required
                ? "Create an account or log in to keep learning."
                : "One account across topics, systems, and 3D scenes."}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(value) => {
            setMode(value as "login" | "signup");
            setError(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="login">Log in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value={mode}>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => void onSubmit(e)}
            >
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
