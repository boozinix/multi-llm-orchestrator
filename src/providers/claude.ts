import type { ProviderModule } from "./types.js";
import { fillAndSend } from "./composer.js";
import { extractors } from "./extract.js";
import { waitForQuietNetwork, waitForStableText } from "../wait.js";

export const claudeProvider: ProviderModule = {
  id: "claude",
  label: "Claude",
  storageFileName: "claude.json",
  baseUrl: "https://claude.ai/new",
  ask: async ({ page, prompt, opts }) => {
    await page.goto("https://claude.ai/new", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForQuietNetwork(page);
    await fillAndSend(page, prompt, opts.typingDelayMs);
    await waitForQuietNetwork(page, 1200);

    const text = await waitForStableText(
      () => extractors.claude(page),
      {
        stableMs: opts.responseStableMs,
        timeoutMs: opts.responseTimeoutMs,
      }
    );
    if (!text) {
      throw new Error(
        "Claude: empty assistant reply (selectors may need an update)."
      );
    }
    return text;
  },
};
