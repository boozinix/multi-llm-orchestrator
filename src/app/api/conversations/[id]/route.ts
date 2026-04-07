import { NextResponse } from "next/server";
import { ensureDb } from "@/lib/db/init";
import {
  deleteConversation,
  getConversation,
  getConversationMessages,
} from "@/lib/db/queries";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  ensureDb();
  const { id } = await context.params;
  const conversation = await getConversation(id);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }
  const messages = await getConversationMessages(id);
  return NextResponse.json({ conversation, messages });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  ensureDb();
  const { id } = await context.params;
  await deleteConversation(id);
  return NextResponse.json({ ok: true });
}
