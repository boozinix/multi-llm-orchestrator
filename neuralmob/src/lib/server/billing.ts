import { isShowcaseMode } from "./showcase";
import { isOwnerUnlimitedEmail } from "./owner-unlimited";

function envTruthy(name: string): boolean {
  const v = (process.env[name] ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * When true, enforce free-tier model list + lifetime run cap + paid credits (not showcase).
 * Production: on by default. Local: set `ENFORCE_BILLING=1` to mirror production rules.
 */
export function isProductionBillingEnabled(): boolean {
  if (isShowcaseMode()) return false;
  if (envTruthy("ENFORCE_BILLING")) return true;
  return process.env.NODE_ENV === "production";
}

/** True when production billing rules apply to this session (owner bypass is off). */
export function shouldEnforceProductionBilling(email: string): boolean {
  return isProductionBillingEnabled() && !isOwnerUnlimitedEmail(email);
}
