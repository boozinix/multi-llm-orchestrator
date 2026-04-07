import type { ProviderModule } from "./types.js";
import { fillAndSend } from "./composer.js";
import { extractors } from "./extract.js";
import { waitForQuietNetwork, waitForStableText } from "../wait.js";

export const chatgptProvider: ProviderModule = {
  id: "chatgpt",
  label: "ChatGPT",
  storageFileName: "chatgpt.json",
  baseUrl: "https://chatgpt.com/",
  ask: async ({ page, prompt, opts }) => {
    await page.goto("https://chatgpt.com/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForQuietNetwork(page);
    await fillAndSend(page, prompt, opts.typingDelayMs);
    await waitForQuietNetwork(page, 1200);

    const text = await waitForStableText(
      () => extractors.chatgpt(page),
      {
        stableMs: opts.responseStableMs,
        timeoutMs: opts.responseTimeoutMs,
      }
    );
    if (!text) {
      throw new Error(
        "ChatGPT: empty assistant reply (selectors may need an update)."
      );
    }
    return text;
  },
};
