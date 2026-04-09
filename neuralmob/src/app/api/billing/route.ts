import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/server/session";
import { getUserBillingSummary, upsertUser } from "@/lib/db/queries";
import { isOwnerUnlimitedEmail } from "@/lib/server/owner-unlimited";
import { shouldEnforceProductionBilling } from "@/lib/server/billing";
import { FREE_MODELS } from "@/lib/pricing";

export async function GET() {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  upsertUser(email);
  const summary = getUserBillingSummary(email);
  if (!summary) {
    return NextResponse.json({ error: "User record missing" }, { status: 500 });
  }

  const enforced = shouldEnforceProductionBilling(email);
  const freeOnly = enforced && summary.user.tier === "free" && !isOwnerUnlimitedEmail(email);

  return NextResponse.json({
    tier: summary.user.tier,
    credit_balance_cents: summary.user.creditBalanceCents,
    lifetime_calls: summary.user.lifetimeCalls,
    owner_unlimited: isOwnerUnlimitedEmail(email),
    billing_enforced: enforced,
    free_model_ids: freeOnly ? [...FREE_MODELS] : null,
    recent_events: summary.recentEvents.map((e) => ({
      id: e.id,
      model: e.model,
      prompt_tokens: e.promptTokens,
      completion_tokens: e.completionTokens,
      cost_cents: e.costCents,
      created_at: e.createdAt,
    })),
  });
}
