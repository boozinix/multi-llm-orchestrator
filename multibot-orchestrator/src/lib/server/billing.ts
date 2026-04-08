import { isShowcaseMode } from "./showcase";

/** Production deploys with real LLM: enforce tier + credit metering (not showcase). */
export function isProductionBillingEnabled(): boolean {
  return process.env.NODE_ENV === "production" && !isShowcaseMode();
}
