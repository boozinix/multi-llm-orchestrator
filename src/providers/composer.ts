import type { Page } from "playwright";
import { sleep } from "../wait.js";

export async function focusAndFillPrompt(
  page: Page,
  text: string,
  _typingDelayMs: number
): Promise<boolean> {
  const candidates = [
    "textarea#prompt-textarea",
    "textarea[data-id]",
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="message"]',
    "textarea",
    'div[contenteditable="true"]',
    "rich-textarea textarea",
    "rich-textarea",
  ];

  for (const sel of candidates) {
    const loc = page.locator(sel).first();
    try {
      await loc.waitFor({ state: "visible", timeout: 4000 });
      await loc.click();
      await loc.fill("");
      if (sel.includes("contenteditable") || sel.includes("rich-textarea")) {
        await loc.fill(text);
      } else {
        await loc.fill(text);
      }
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

export async function pressSend(page: Page): Promise<void> {
  const sendSelectors = [
    'button[data-testid="send-button"]',
    'button[aria-label="Send"]',
    'button[aria-label*="send" i]',
    'button[title="Send"]',
    "button.composer-btn-submit",
    'button:has-text("Send")',
  ];
  for (const sel of sendSelectors) {
    const btn = page.locator(sel).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await sleep(200);
      return;
    }
  }
  await page.keyboard.press("Enter");
}

export async function fillAndSend(
  page: Page,
  text: string,
  typingDelayMs: number
): Promise<void> {
  const ok = await focusAndFillPrompt(page, text, typingDelayMs);
  if (!ok) {
    throw new Error(
      "Could not find a message composer (textarea/contenteditable). The page layout may have changed."
    );
  }
  await sleep(150);
  await pressSend(page);
}
