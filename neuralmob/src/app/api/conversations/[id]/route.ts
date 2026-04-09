import { NextRequest, NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/server/session";
import { getConversationForUser, getMessages, deleteConversationForUser } from "@/lib/db/queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await getConversationForUser(id, email);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await getMessages(id);
  return NextResponse.json({ conversation, messages });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteConversationForUser(id, email);
  return NextResponse.json({ ok: true });
}
