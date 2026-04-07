import type { ProviderModule } from "./types.js";
import { fillAndSend } from "./composer.js";
import { extractors } from "./extract.js";
import { waitForQuietNetwork, waitForStableText } from "../wait.js";

/**
 * Perplexity often wraps answers with citations; we scrape visible prose text.
 */
export const perplexityProvider: ProviderModule = {
  id: "perplexity",
  label: "Perplexity",
  storageFileName: "perplexity.json",
  baseUrl: "https://www.perplexity.ai/",
  ask: async ({ page, prompt, opts }) => {
    await page.goto("https://www.perplexity.ai/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForQuietNetwork(page);
    await fillAndSend(page, prompt, opts.typingDelayMs);
    await waitForQuietNetwork(page, 1200);

    const text = await waitForStableText(
      () => extractors.perplexity(page),
      {
        stableMs: opts.responseStableMs,
        timeoutMs: opts.responseTimeoutMs,
      }
    );
    if (!text) {
      throw new Error(
        "Perplexity: empty assistant reply (selectors may need an update)."
      );
    }
    return text;
  },
};
