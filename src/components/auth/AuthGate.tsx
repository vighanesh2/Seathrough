"use client";

/** @deprecated Login is optional; kept as a pass-through for older imports. */
export function AuthGate({ children }: { children: React.ReactNode; title?: string; description?: string }) {
  return <>{children}</>;
}
