import { NextRequest, NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/server/session";
import { skipSlot } from "@/lib/server/run-registry";

export async function POST(req: NextRequest) {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { runId, slotId } = body as Record<string, unknown>;
  if (typeof runId !== "string" || typeof slotId !== "string") {
    return NextResponse.json({ error: "Missing runId or slotId" }, { status: 400 });
  }

  const ok = skipSlot(runId, slotId);
  return NextResponse.json({ ok });
}
