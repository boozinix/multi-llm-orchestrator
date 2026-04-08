import { isShowcaseMode } from "./showcase";
import { isOwnerUnlimitedEmail } from "./owner-unlimited";

/** Production deploys with real LLM: enforce tier + credit metering (not showcase). */
export function isProductionBillingEnabled(): boolean {
  return process.env.NODE_ENV === "production" && !isShowcaseMode();
}

/** True when production billing rules apply to this session (owner bypass is off). */
export function shouldEnforceProductionBilling(email: string): boolean {
  return isProductionBillingEnabled() && !isOwnerUnlimitedEmail(email);
}
