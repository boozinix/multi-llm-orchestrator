import type { BrowserContext, Page } from "playwright";
import type { ProviderId } from "../config.js";

export type AskOptions = {
  responseStableMs: number;
  responseTimeoutMs: number;
  typingDelayMs: number;
};

export type ProviderModule = {
  id: ProviderId;
  label: string;
  /** File name under storage dir, without path. */
  storageFileName: string;
  /** Initial navigation URL. */
  baseUrl: string;
  /**
   * Navigate if needed, send `prompt`, wait for assistant reply, return plain text.
   */
  ask: (ctx: {
    page: Page;
    context: BrowserContext;
    prompt: string;
    opts: AskOptions;
  }) => Promise<string>;
};
