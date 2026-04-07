import type { Page } from "playwright";

export async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Poll until `getText()` returns the same non-empty string for `stableMs`,
 * or until `timeoutMs` elapses (returns last seen text).
 */
export async function waitForStableText(
  getText: () => Promise<string>,
  opts: { stableMs: number; timeoutMs: number; pollMs?: number }
): Promise<string> {
  const pollMs = opts.pollMs ?? 400;
  const start = Date.now();
  let last = "";
  let stableAt = Date.now();

  while (Date.now() - start < opts.timeoutMs) {
    const text = (await getText()).trim();
    if (text.length === 0) {
      await sleep(pollMs);
      continue;
    }
    if (text === last) {
      if (Date.now() - stableAt >= opts.stableMs) return text;
    } else {
      last = text;
      stableAt = Date.now();
    }
    await sleep(pollMs);
  }
  return last;
}

/** Wait for network to settle briefly after submit. */
export async function waitForQuietNetwork(page: Page, ms = 800): Promise<void> {
  try {
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
  } catch {
    /* ignore */
  }
  await sleep(ms);
}
