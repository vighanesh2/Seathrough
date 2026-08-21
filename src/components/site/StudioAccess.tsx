"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useQuestionAccess } from "@/components/usage/QuestionAccess";
import { useSmoothNavigate } from "@/lib/navigation/smoothNavigate";

type AuthMode = "login" | "signup";

type StudioAccessValue = {
  openStudio: (href: string) => void;
  openAuth: (mode?: AuthMode) => void;
};

const StudioAccessContext = createContext<StudioAccessValue | null>(null);

/** Marketing helper: navigate into a workspace without forcing login. */
export function StudioAccessProvider({ children }: { children: React.ReactNode }) {
  const navigate = useSmoothNavigate();
  const { openAuth } = useQuestionAccess();

  const openStudio = useCallback(
    (href: string) => {
      navigate(href);
    },
    [navigate],
  );

  const value = useMemo(
    () => ({ openStudio, openAuth }),
    [openStudio, openAuth],
  );

  return (
    <StudioAccessContext.Provider value={value}>
      {children}
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
