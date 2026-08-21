"use client";

import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import { BrandMark } from "@/components/lms/BrandMark";

type AuthGateProps = {
  children: React.ReactNode;
  title: string;
  description: string;
};

export function AuthGate({ children, title, description }: AuthGateProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted">Checking your session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative flex h-dvh flex-col overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(600px_200px_at_50%_0%,rgba(27,108,168,0.16),transparent)]" />
        <header className="relative z-10 flex items-center px-4 py-3 md:px-6">
          <BrandMark />
        </header>
        <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
          <p className="font-mono text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
            Studio
          </p>
          <h1 className="mt-3 max-w-md font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">
            {description}
          </p>
        </div>
        <AuthModal open required initialMode="login" onClose={() => undefined} />
      </div>
    );
  }

  return <>{children}</>;
}
