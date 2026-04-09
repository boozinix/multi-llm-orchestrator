import type { FlowConfig } from "./types";

/** Dev / non-billing: per-day caps in SQLite `daily_usage`. */
export const DAILY_RUN_LIMIT = 10;
export const DAILY_API_CALL_LIMIT = 30;

/** Production free tier: successful orchestrations allowed before upgrade (lifetime, not daily). */
export const FREE_TIER_LIFETIME_RUN_CAP = 1;

export function estimateApiCalls(flow: FlowConfig): number {
  if (flow.mode === "quick") return 1;

  const enabledBots = [flow.bot1Enabled, flow.bot2Enabled, flow.bot3Enabled].filter(Boolean).length;

  let mergeCalls = 0;
  if (flow.merge12Enabled && flow.bot1Enabled && flow.bot2Enabled) mergeCalls++;
  if (flow.merge123Enabled && flow.bot3Enabled) mergeCalls++;

  return enabledBots + mergeCalls;
}
