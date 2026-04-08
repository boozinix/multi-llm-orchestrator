import { NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/server/session";
import { sqlite } from "@/lib/db/client";
import { ensureDb } from "@/lib/db/init";

/** Temporary dev helper: clears daily run / API-call counters. */
export async function POST() {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  ensureDb();
  const r = sqlite.prepare("DELETE FROM daily_usage").run();
  return NextResponse.json({ ok: true, removed: r.changes });
}
