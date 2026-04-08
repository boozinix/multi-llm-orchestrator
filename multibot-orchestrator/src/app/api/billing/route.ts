import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/server/session";
import { getUserBillingSummary, upsertUser } from "@/lib/db/queries";

export async function GET() {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  upsertUser(email);
  const summary = getUserBillingSummary(email);
  if (!summary) {
    return NextResponse.json({ error: "User record missing" }, { status: 500 });
  }

  return NextResponse.json({
    tier: summary.user.tier,
    credit_balance_cents: summary.user.creditBalanceCents,
    lifetime_calls: summary.user.lifetimeCalls,
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
