import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, "..");

export type ProviderId = "chatgpt" | "claude" | "gemini" | "perplexity";

/** Which browser Playwright drives (not your OS default browser). */
export type PlaywrightBrowserName = "firefox" | "chromium";

function parsePlaywrightBrowser(): PlaywrightBrowserName {
  const raw = (process.env.PLAYWRIGHT_BROWSER ?? "chromium").trim().toLowerCase();
  if (raw === "chromium" || raw === "chrome") return "chromium";
  return "firefox";
}

const DEFAULT_ENABLED: ProviderId[] = [
  "gemini",
  "chatgpt",
  "claude",
  "perplexity",
];

function parseEnabled(): ProviderId[] {
  const raw = process.env.ENABLED_PROVIDERS?.trim();
  if (!raw) return DEFAULT_ENABLED;
  const ids = raw.split(",").map((s) => s.trim().toLowerCase());
  const valid: ProviderId[] = [];
  for (const id of ids) {
    if (
      id === "chatgpt" ||
      id === "claude" ||
      id === "gemini" ||
      id === "perplexity"
    ) {
      valid.push(id);
    }
  }
  return valid.length ? valid : DEFAULT_ENABLED;
}

export const config = {
  port: Number(process.env.PORT ?? 3847),
  /**
   * `chromium` (default) is the most stable on this machine.
   * Override with `PLAYWRIGHT_BROWSER=firefox` if you explicitly want Firefox.
   */
  playwrightBrowser: parsePlaywrightBrowser(),
  /** Headless is more likely to trip bot checks; default false. */
  headless: process.env.HEADLESS === "1" || process.env.HEADLESS === "true",
  storageDir: path.resolve(
    PROJECT_ROOT,
    process.env.STORAGE_DIR ?? ".playwright"
  ),
  enabledProviders: parseEnabled(),
  /** Run Phase A in parallel (separate contexts). Set false to serialize. */
  parallelPhaseA: process.env.PHASE_A_SEQUENTIAL !== "1",
  /** Max wait for a reply to stop changing (ms). */
  responseStableMs: Number(process.env.RESPONSE_STABLE_MS ?? 2500),
  /** Overall cap per ask (ms). */
  responseTimeoutMs: Number(process.env.RESPONSE_TIMEOUT_MS ?? 180_000),
  /** Pause between keystrokes (ms) for some composers. */
  typingDelayMs: Number(process.env.TYPING_DELAY_MS ?? 2),
};

export function storagePath(id: ProviderId): string {
  return path.join(config.storageDir, `${id}.json`);
}

export function ensureStorageDir(): void {
  fs.mkdirSync(config.storageDir, { recursive: true });
}
