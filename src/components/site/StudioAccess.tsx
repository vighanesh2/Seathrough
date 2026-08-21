"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";

type AuthMode = "login" | "signup";

type StudioAccessValue = {
  openStudio: (href: string) => void;
  openAuth: (mode?: AuthMode) => void;
};

const StudioAccessContext = createContext<StudioAccessValue | null>(null);

export function StudioAccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [nextHref, setNextHref] = useState<string | null>(null);

  const openStudio = useCallback(
    (href: string) => {
      if (user) {
        router.push(href);
        return;
      }
      setNextHref(href);
      setAuthMode("signup");
      setAuthOpen(true);
    },
    [router, user],
  );

  const openAuth = useCallback((mode: AuthMode = "login") => {
    setNextHref(null);
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openStudio, openAuth }),
    [openStudio, openAuth],
  );

  return (
    <StudioAccessContext.Provider value={value}>
      {children}
      <AuthModal
        key={`${authMode}-${authOpen ? "open" : "closed"}`}
        open={authOpen}
        initialMode={authMode}
        onSuccess={() => {
          if (nextHref) router.push(nextHref);
        }}
        onClose={() => {
          setAuthOpen(false);
          setNextHref(null);
        }}
      />
    </StudioAccessContext.Provider>
  );
}

export function useStudioAccess(): StudioAccessValue {
  const ctx = useContext(StudioAccessContext);
  if (!ctx) {
    throw new Error("useStudioAccess must be used within StudioAccessProvider");
  }
  return ctx;
}
