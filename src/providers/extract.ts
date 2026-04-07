import type { Page } from "playwright";

/** Return innerText of the last matching locator, or empty string. */
export async function lastInnerText(
  page: Page,
  selector: string
): Promise<string> {
  const loc = page.locator(selector);
  const n = await loc.count();
  if (n === 0) return "";
  return (await loc.nth(n - 1).innerText()).trim();
}

export async function extractFirstWorking(
  page: Page,
  selectors: string[]
): Promise<string> {
  for (const sel of selectors) {
    const t = await lastInnerText(page, sel);
    if (t.length > 0) return t;
  }
  return "";
}

export const extractors = {
  async chatgpt(page: Page): Promise<string> {
    return extractFirstWorking(page, [
      '[data-message-author-role="assistant"]',
      '[data-testid*="conversation-turn"] [data-message-author-role="assistant"]',
    ]);
  },

  async claude(page: Page): Promise<string> {
    return extractFirstWorking(page, [
      '[data-testid="assistant-message"]',
      "div.font-claude-message",
      'div[data-role="assistant"]',
      "div.markdown",
    ]);
  },

  async gemini(page: Page): Promise<string> {
    return extractFirstWorking(page, [
      "message-content",
      "div.model-response-text",
      '[data-message-author-role="model"]',
      "div.markdown",
    ]);
  },

  async perplexity(page: Page): Promise<string> {
    return extractFirstWorking(page, [
      "div.prose",
      '[data-testid="answer"]',
      "article",
    ]);
  },
};
