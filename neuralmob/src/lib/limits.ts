import type { FlowConfig } from "./types";

export const DAILY_RUN_LIMIT = 10;
export const DAILY_API_CALL_LIMIT = 30;

export function estimateApiCalls(flow: FlowConfig): number {
  if (flow.mode === "quick") return 1;

  const enabledBots = [flow.bot1Enabled, flow.bot2Enabled, flow.bot3Enabled].filter(Boolean).length;

  let mergeCalls = 0;
  if (flow.merge12Enabled && flow.bot1Enabled && flow.bot2Enabled) mergeCalls++;
  if (flow.merge123Enabled && flow.bot3Enabled) mergeCalls++;

  return enabledBots + mergeCalls;
}
