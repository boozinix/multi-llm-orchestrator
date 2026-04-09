import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/server/session";
import { clearDailyUsage } from "@/lib/db/queries";

/** Temporary dev helper: clears daily run / API-call counters. */
export async function POST() {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const removed = await clearDailyUsage();
  return NextResponse.json({ ok: true, removed });
}
