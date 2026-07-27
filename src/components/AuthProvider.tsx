"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export type AuthUser = {
  id: string;
  username: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  accessToken: string | null;
  login: (username: string, password: string) => Promise<string | null>;
  signup: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function applySession(session: {
  access_token: string;
  refresh_token: string;
}) {
  const supabase = getBrowserSupabase();
  await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const supabase = getBrowserSupabase();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      setAccessToken(token);

      if (!token) {
        setUser(null);
        return;
      }

      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setUser(null);
        setAccessToken(null);
        return;
      }
      const body = (await res.json()) as {
        user?: { id: string; username: string } | null;
      };
      setUser(body.user ?? null);
    } catch {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        await refresh();
      } finally {
        if (alive) setLoading(false);
      }
    })();

    let unsubscribe: (() => void) | undefined;
    try {
      const supabase = getBrowserSupabase();
      const { data } = supabase.auth.onAuthStateChange(() => {
        void refresh();
      });
      unsubscribe = () => data.subscription.unsubscribe();
    } catch {
      // env missing in some preview contexts
    }

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = (await res.json()) as {
        error?: string;
        user?: AuthUser;
        session?: { access_token: string; refresh_token: string };
      };
      if (!res.ok || !body.session || !body.user) {
        return body.error || "Could not log in";
      }
      await applySession(body.session);
      setUser(body.user);
      setAccessToken(body.session.access_token);
      return null;
    } catch {
      return "Could not log in. Please try again.";
    }
  }, []);

  const signup = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = (await res.json()) as {
        error?: string;
        user?: AuthUser;
        session?: { access_token: string; refresh_token: string };
      };
      if (!res.ok || !body.session || !body.user) {
        return body.error || "Could not create account";
      }
      await applySession(body.session);
      setUser(body.user);
      setAccessToken(body.session.access_token);
      return null;
    } catch {
      return "Could not create account. Please try again.";
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const supabase = getBrowserSupabase();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setAccessToken(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      accessToken,
      login,
      signup,
      logout,
      refresh,
    }),
    [user, loading, accessToken, login, signup, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
