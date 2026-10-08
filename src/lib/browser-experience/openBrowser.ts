import {
  browserbaseConfigured,
  openBrowserbaseSession,
} from "@/lib/browser-experience/browserbase";
import type { LiveBrowserHandle } from "@/lib/browser-experience/driver";
import {
  localPlaywrightAllowed,
} from "@/lib/browser-experience/host";
import { openLocalBrowserSession } from "@/lib/browser-experience/playwrightLocal";

export { isServerlessHost, localPlaywrightAllowed } from "@/lib/browser-experience/host";

export async function openLiveBrowser(): Promise<LiveBrowserHandle> {
  if (browserbaseConfigured()) {
    return openBrowserbaseSession();
  }
  if (!localPlaywrightAllowed()) {
    throw new Error(
      "Add BROWSERBASE_API_KEY (and optionally BROWSERBASE_PROJECT_ID) in Vercel env. Local Chromium cannot run on this host.",
    );
  }
  return openLocalBrowserSession();
}

export function preferredBrowserProvider(): "browserbase" | "local" | "none" {
  if (browserbaseConfigured()) return "browserbase";
  if (localPlaywrightAllowed()) return "local";
  return "none";
}
