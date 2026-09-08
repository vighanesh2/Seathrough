"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/components/AuthProvider";
import {
  canAskAnonymous,
  consumeQuestion,
  DAILY_QUESTION_LIMIT,
  refundQuestion,
  remainingQuestions,
} from "@/lib/usage/dailyQuota";

type AuthMode = "login" | "signup";

type QuestionAccessValue = {
  /** Remaining free questions today (Infinity when signed in). */
  remaining: number;
  dailyLimit: number;
  /** True if this submit may proceed (signed in or free budget left). */
  canAsk: () => boolean;
  /**
   * Call when the user sends a real question.
   * Returns false if blocked — auth modal opens.
   */
  beginQuestion: () => boolean;
  /** Call if the ask was aborted / failed before any real work. */
  cancelQuestion: () => void;
  openAuth: (mode?: AuthMode) => void;
};

const QuestionAccessContext = createContext<QuestionAccessValue | null>(null);
const subscribeHydration = () => () => {};

export function QuestionAccessProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [authOpen, setAuthOpen] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [, setTick] = useState(0);
  const quotaHydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );

  const remaining = user
    ? Number.POSITIVE_INFINITY
    : quotaHydrated
      ? remainingQuestions()
      : DAILY_QUESTION_LIMIT;

  const openAuth = useCallback((mode: AuthMode = "login") => {
    setAuthRequired(false);
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const canAsk = useCallback(() => {
    if (user) return true;
    return canAskAnonymous();
  }, [user]);

  const beginQuestion = useCallback(() => {
    if (user) return true;
    if (!canAskAnonymous()) {
      setAuthMode("signup");
      setAuthRequired(true);
      setAuthOpen(true);
      return false;
    }
    const ok = consumeQuestion();
    setTick((n) => n + 1);
    if (!ok) {
      setAuthMode("signup");
      setAuthRequired(true);
      setAuthOpen(true);
      return false;
    }
    return true;
  }, [user]);

  const cancelQuestion = useCallback(() => {
    if (user) return;
    refundQuestion();
    setTick((n) => n + 1);
  }, [user]);

  const value = useMemo(
    () => ({
      remaining,
      dailyLimit: DAILY_QUESTION_LIMIT,
      canAsk,
      beginQuestion,
      cancelQuestion,
      openAuth,
    }),
    [remaining, canAsk, beginQuestion, cancelQuestion, openAuth],
  );

  return (
    <QuestionAccessContext.Provider value={value}>
      {children}
      <AuthModal
        key={`${authMode}-${authOpen ? "open" : "closed"}-${authRequired}`}
        open={authOpen}
        required={authRequired}
        initialMode={authMode}
        quotaExhausted={authRequired}
        onClose={() => {
          setAuthOpen(false);
          setAuthRequired(false);
        }}
      />
    </QuestionAccessContext.Provider>
  );
}

export function useQuestionAccess(): QuestionAccessValue {
  const ctx = useContext(QuestionAccessContext);
  if (!ctx) {
    throw new Error(
      "useQuestionAccess must be used within QuestionAccessProvider",
    );
  }
  return ctx;
}
