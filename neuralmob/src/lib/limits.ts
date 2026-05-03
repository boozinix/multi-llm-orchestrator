import type { FlowConfig } from "./types";

/** Dev / non-billing: per-day caps in SQLite `daily_usage`. */
export const DAILY_RUN_LIMIT = 10;
export const DAILY_API_CALL_LIMIT = 30;

/** Production free tier starter credit. */
export const FREE_STARTER_CREDIT_CENTS = Number(process.env.FREE_STARTER_CREDIT_CENTS ?? 50);

/** All model calls are capped so worst-case spend can be reserved before execution. */
export const MODEL_MAX_OUTPUT_TOKENS = Number(process.env.MODEL_MAX_OUTPUT_TOKENS ?? 2048);

/** Conservative safety margin so reserved credit stays above actual billable cost. */
export const RUN_COST_SAFETY_MULTIPLIER = Number(process.env.RUN_COST_SAFETY_MULTIPLIER ?? 1.35);

export function estimateApiCalls(flow: FlowConfig): number {
  if (flow.mode === "quick") return 1;

  const enabledBots = [flow.bot1Enabled, flow.bot2Enabled, flow.bot3Enabled].filter(Boolean).length;

  if (flow.mode === "chain") return enabledBots;

  let mergeCalls = 0;
  if (flow.merge12Enabled && flow.bot1Enabled && flow.bot2Enabled) mergeCalls++;
  if (flow.merge123Enabled && flow.bot3Enabled) mergeCalls++;

  return enabledBots + mergeCalls;
}
