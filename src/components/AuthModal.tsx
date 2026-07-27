"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

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

  if (!open) return null;

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
    <div
      className={[
        "fixed inset-0 z-[80] flex items-center justify-center p-4",
        required
          ? "bg-[radial-gradient(ellipse_at_top,#f7f3ea_0%,#e8eef5_55%,#d9e4ef_100%)]"
          : "bg-[rgba(26,43,60,0.55)]",
      ].join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "Log in" : "Sign up"}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy && !required) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-board-edge bg-chalk p-6 shadow-[var(--shadow-board)]">
        <div className="mb-5 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img
            src="/SeeThrough_logo.png"
            alt="SeeThrough"
            className="mb-4 h-20 w-auto object-contain"
          />
          <div className="relative w-full">
            {!required ? (
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="absolute top-0 right-0 rounded-lg px-2 py-1 font-sans text-sm text-muted hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            ) : null}
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              {mode === "login" ? "Welcome back" : "Create account"}
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-ink">
              {mode === "login" ? "Log in" : "Sign up"}
            </h2>
            <p className="mt-1 font-sans text-sm text-muted">
              {required
                ? "Sign in to open your whiteboard and private lesson chats."
                : "Use a username and password to save your lessons."}
            </p>
          </div>
        </div>

        <form className="flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)}>
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-xs font-semibold text-ink-soft">
              Username
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              disabled={busy}
              placeholder="e.g. alex"
              className="h-11 rounded-xl border border-board-edge bg-paper px-3 font-sans text-sm text-ink outline-none focus:border-accent focus:ring-3 focus:ring-accent-soft"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-xs font-semibold text-ink-soft">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              disabled={busy}
              placeholder="At least 6 characters"
              className="h-11 rounded-xl border border-board-edge bg-paper px-3 font-sans text-sm text-ink outline-none focus:border-accent focus:ring-3 focus:ring-accent-soft"
            />
          </label>

          {error ? (
            <p className="rounded-xl bg-warn-soft px-3 py-2 font-sans text-sm text-warn">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !username.trim() || !password}
            className="mt-1 h-11 rounded-xl bg-accent font-sans text-sm font-semibold text-white transition hover:bg-accent-deep disabled:opacity-40"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center font-sans text-sm text-muted">
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
      </div>
    </div>
  );
}
