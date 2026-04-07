import fs from "node:fs";
import { chromium, firefox, type Browser } from "playwright";
import { config, storagePath, type ProviderId } from "./config.js";

/**
 * Launches Playwright’s bundled browser (not your OS default).
 * Prefer Firefox to reduce “automation test” banners that break provider logins.
 */
export async function launchBrowser(): Promise<Browser> {
  return launchBrowserWithHeadless(config.headless);
}

/** Used by `npm run login` (always headed). */
export async function launchBrowserWithHeadless(headless: boolean): Promise<Browser> {
  if (config.playwrightBrowser === "chromium") {
    return chromium.launch({
      headless,
      args: ["--disable-blink-features=AutomationControlled"],
    });
  }
  return firefox.launch({ headless });
}

export function hasStorageState(id: ProviderId): boolean {
  return fs.existsSync(storagePath(id));
}

export async function newLoggedInContext(browser: Browser, id: ProviderId) {
  const path = storagePath(id);
  if (!fs.existsSync(path)) {
    throw new Error(
      `Missing saved session for "${id}" at ${path}. Run: npm run login`
    );
  }
  return browser.newContext({
    storageState: path,
    viewport: { width: 1360, height: 900 },
  });
}
