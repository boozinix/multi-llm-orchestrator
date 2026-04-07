import type { FlowConfig } from "@/lib/types";

export const DAILY_RUN_LIMIT = 10;
export const DAILY_API_CALL_LIMIT = 30;

export function getDailyKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function estimateApiCallsForRequest(mode: "quick" | "super", flow: FlowConfig) {
  if (mode === "quick") {
    return 1;
  }
  // Matches requested semantics: 1 API call per enabled bot slot.
  return flow.order.filter((slotId) => flow.slots[slotId].enabled).length;
}
