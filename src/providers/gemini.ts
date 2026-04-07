import type { ProviderModule } from "./types.js";
import { fillAndSend } from "./composer.js";
import { extractors } from "./extract.js";
import { waitForQuietNetwork, waitForStableText } from "../wait.js";

export const geminiProvider: ProviderModule = {
  id: "gemini",
  label: "Gemini",
  storageFileName: "gemini.json",
  baseUrl: "https://gemini.google.com/app",
  ask: async ({ page, prompt, opts }) => {
    await page.goto("https://gemini.google.com/app", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForQuietNetwork(page);
    await fillAndSend(page, prompt, opts.typingDelayMs);
    await waitForQuietNetwork(page, 1200);

    const text = await waitForStableText(
      () => extractors.gemini(page),
      {
        stableMs: opts.responseStableMs,
        timeoutMs: opts.responseTimeoutMs,
      }
    );
    if (!text) {
      throw new Error(
        "Gemini: empty assistant reply (selectors may need an update)."
      );
    }
    return text;
  },
};
