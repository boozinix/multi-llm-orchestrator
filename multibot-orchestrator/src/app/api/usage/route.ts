import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/server/session";
import { getDailyUsage } from "@/lib/db/queries";
import { DAILY_RUN_LIMIT, DAILY_API_CALL_LIMIT } from "@/lib/limits";

export async function GET() {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const usage = getDailyUsage();
  return NextResponse.json({
    runs: usage.runs,
    apiCalls: usage.apiCalls,
    runLimit: DAILY_RUN_LIMIT,
    apiCallLimit: DAILY_API_CALL_LIMIT,
  });
}
