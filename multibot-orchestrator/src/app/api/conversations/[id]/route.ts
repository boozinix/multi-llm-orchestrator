import { NextRequest, NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/server/session";
import { getConversation, getMessages, deleteConversation } from "@/lib/db/queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = getConversation(id);
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = getMessages(id);
  return NextResponse.json({ conversation, messages });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  deleteConversation(id);
  return NextResponse.json({ ok: true });
}
