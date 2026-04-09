import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/server/session";
import { getDailyUsage, getUserByEmail, upsertUser } from "@/lib/db/queries";
import { DAILY_RUN_LIMIT, DAILY_API_CALL_LIMIT, FREE_TIER_LIFETIME_RUN_CAP } from "@/lib/limits";
import { isProductionBillingEnabled } from "@/lib/server/billing";
import { isOwnerUnlimitedEmail } from "@/lib/server/owner-unlimited";

export async function GET() {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  upsertUser(email);
  const user = getUserByEmail(email);
  if (!user) return NextResponse.json({ error: "User record missing" }, { status: 500 });

  if (!isProductionBillingEnabled()) {
    const usage = getDailyUsage();
    return NextResponse.json({
      mode: "daily",
      runs: usage.runs,
      apiCalls: usage.apiCalls,
      runLimit: DAILY_RUN_LIMIT,
      apiCallLimit: DAILY_API_CALL_LIMIT,
    });
  }

  if (isOwnerUnlimitedEmail(email)) {
    return NextResponse.json({
      mode: "owner_unlimited",
      runs: 0,
      apiCalls: 0,
      runLimit: -1,
      apiCallLimit: -1,
    });
  }

  if (user.tier === "paid") {
    return NextResponse.json({
      mode: "paid_credits",
      runs: user.lifetimeCalls,
      apiCalls: 0,
      runLimit: -1,
      apiCallLimit: -1,
      credit_balance_cents: user.creditBalanceCents,
    });
  }

  return NextResponse.json({
    mode: "free_lifetime",
    runs: user.lifetimeCalls,
    apiCalls: 0,
    runLimit: FREE_TIER_LIFETIME_RUN_CAP,
    apiCallLimit: 0,
    free_runs_remaining: Math.max(0, FREE_TIER_LIFETIME_RUN_CAP - user.lifetimeCalls),
  });
}
