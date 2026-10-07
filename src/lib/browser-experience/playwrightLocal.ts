import { chromium, type Browser } from "playwright-core";
import type { LiveBrowserHandle } from "@/lib/browser-experience/driver";

let sharedBrowserPromise: Promise<Browser> | null = null;

async function launchChromium(): Promise<Browser> {
  const args = [
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--disable-gpu",
    "--window-size=1280,800",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-blink-features=AutomationControlled",
  ];
  // Prefer Playwright's Chromium, then the machine's installed Chrome.
  try {
    return await chromium.launch({ headless: true, args });
  } catch {
    return chromium.launch({
      headless: true,
      channel: "chrome",
      args,
    });
  }
}

async function getSharedBrowser(): Promise<Browser> {
  if (!sharedBrowserPromise) {
    sharedBrowserPromise = launchChromium().catch((error) => {
      sharedBrowserPromise = null;
      const message =
        error instanceof Error ? error.message : "Chromium launch failed";
      throw new Error(
        `Local browser failed to start. Install Chromium with \`npx playwright install chromium\`, or set BROWSERBASE_API_KEY. (${message})`,
      );
    });
  }
  return sharedBrowserPromise;
}

export async function openLocalBrowserSession(): Promise<LiveBrowserHandle> {
  const browser = await getSharedBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  const page = await context.newPage();
  return {
    provider: "local",
    liveViewUrl: null,
    browser,
    page,
  };
}

export async function localBrowserAvailable(): Promise<boolean> {
  try {
    await getSharedBrowser();
    return true;
  } catch {
    return false;
  }
}
