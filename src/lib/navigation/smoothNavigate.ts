"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/** Navigate with a smooth View Transition when the browser supports it. */
export function useSmoothNavigate() {
  const router = useRouter();

  return useCallback(
    (href: string) => {
      const go = () => {
        router.push(href);
      };

      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      };

      if (typeof doc.startViewTransition === "function") {
        try {
          doc.startViewTransition(go);
          return;
        } catch {
          /* fall through */
        }
      }
      go();
    },
    [router],
  );
}
