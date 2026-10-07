import { browserbaseConfigured, openBrowserbaseSession } from "@/lib/browser-experience/browserbase";
import type { LiveBrowserHandle } from "@/lib/browser-experience/driver";
import { openLocalBrowserSession } from "@/lib/browser-experience/playwrightLocal";

export async function openLiveBrowser(): Promise<LiveBrowserHandle> {
  if (browserbaseConfigured()) {
    return openBrowserbaseSession();
  }
  return openLocalBrowserSession();
}

export function preferredBrowserProvider(): "browserbase" | "local" | "none" {
  if (browserbaseConfigured()) return "browserbase";
  return "local";
}
