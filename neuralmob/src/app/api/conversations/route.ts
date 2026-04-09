import { NextRequest, NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/server/session";
import { listConversationsForUser, createConversationForUser } from "@/lib/db/queries";
import { normalizeFlowConfig, normalizeModelConfig } from "@/lib/constants";

export async function GET() {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await listConversationsForUser(email);
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const flow = normalizeFlowConfig(body.flow);
  const models = normalizeModelConfig(body.models);

  const conversation = await createConversationForUser(email, flow, models);
  return NextResponse.json({ conversation }, { status: 201 });
}
