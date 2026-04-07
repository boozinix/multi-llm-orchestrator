import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_FLOW, DEFAULT_MODELS } from "@/lib/constants";
import { ensureDb } from "@/lib/db/init";
import {
  createConversation,
  getConversationMessages,
  listConversations,
  upsertConversationState,
} from "@/lib/db/queries";

const createSchema = z.object({
  title: z.string().trim().max(120).optional(),
});

const patchSchema = z.object({
  conversationId: z.string().min(1),
  title: z.string().trim().max(120).optional(),
  flow: z.any().optional(),
  models: z.any().optional(),
});

export async function GET() {
  ensureDb();
  const conversations = await listConversations();
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  ensureDb();
  const raw = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const conversation = await createConversation({
    title: parsed.data.title ?? "New conversation",
    flow: DEFAULT_FLOW,
    models: DEFAULT_MODELS,
  });
  return NextResponse.json({ conversation });
}

export async function PATCH(request: Request) {
  ensureDb();
  const raw = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await upsertConversationState({
    conversationId: parsed.data.conversationId,
    title: parsed.data.title,
    flow: parsed.data.flow ?? DEFAULT_FLOW,
    models: parsed.data.models ?? DEFAULT_MODELS,
  });
  const messages = await getConversationMessages(parsed.data.conversationId);
  return NextResponse.json({ ok: true, messages });
}
