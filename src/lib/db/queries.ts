import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { DEFAULT_FLOW, DEFAULT_MODELS } from "@/lib/constants";
import type { ChatMessage, ConversationRecord, FlowConfig, ModelConfig } from "@/lib/types";
import { db, sqlite } from "./client";
import { conversations, messages } from "./schema";

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapConversationRow(row: typeof conversations.$inferSelect): ConversationRecord {
  return {
    id: row.id,
    title: row.title,
    flow: parseJson<FlowConfig>(row.flow, DEFAULT_FLOW),
    models: parseJson<ModelConfig>(row.models, DEFAULT_MODELS),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapMessageRow(row: typeof messages.$inferSelect): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listConversations() {
  const rows = await db.select().from(conversations).orderBy(desc(conversations.updatedAt));
  return rows.map(mapConversationRow);
}

export async function getConversation(conversationId: string) {
  const row = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  return row ? mapConversationRow(row) : null;
}

export async function getConversationMessages(conversationId: string) {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
  return rows.map(mapMessageRow);
}

export async function createConversation(input?: {
  title?: string | null;
  flow?: FlowConfig;
  models?: ModelConfig;
}) {
  const now = new Date();
  const id = randomUUID();
  await db.insert(conversations).values({
    id,
    title: input?.title ?? "New conversation",
    flow: JSON.stringify(input?.flow ?? DEFAULT_FLOW),
    models: JSON.stringify(input?.models ?? DEFAULT_MODELS),
    createdAt: now,
    updatedAt: now,
  });
  const created = await getConversation(id);
  if (!created) {
    throw new Error("Conversation creation failed.");
  }
  return created;
}

export async function upsertConversationState(input: {
  conversationId: string;
  title?: string | null;
  flow: FlowConfig;
  models: ModelConfig;
}) {
  const now = new Date();
  await db
    .insert(conversations)
    .values({
      id: input.conversationId,
      title: input.title ?? "New conversation",
      flow: JSON.stringify(input.flow),
      models: JSON.stringify(input.models),
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: conversations.id,
      set: {
        title: input.title ?? "New conversation",
        flow: JSON.stringify(input.flow),
        models: JSON.stringify(input.models),
        updatedAt: now,
      },
    });
}

export async function addConversationMessage(input: {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
}) {
  await db.insert(messages).values({
    id: randomUUID(),
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    createdAt: new Date(),
  });
}

export async function deleteConversation(conversationId: string) {
  await db.delete(messages).where(eq(messages.conversationId, conversationId));
  await db.delete(conversations).where(eq(conversations.id, conversationId));
}

export async function replaceConversationMessages(input: {
  conversationId: string;
  nextMessages: Array<Pick<ChatMessage, "role" | "content">>;
}) {
  await db.delete(messages).where(eq(messages.conversationId, input.conversationId));
  if (input.nextMessages.length === 0) {
    return;
  }
  await db.insert(messages).values(
    input.nextMessages.map((message) => ({
      id: randomUUID(),
      conversationId: input.conversationId,
      role: message.role,
      content: message.content,
      createdAt: new Date(),
    })),
  );
}

export async function updateConversationTitleFromFirstMessage(conversationId: string) {
  const firstUserMessage = await db.query.messages.findFirst({
    where: and(eq(messages.conversationId, conversationId), eq(messages.role, "user")),
    orderBy: asc(messages.createdAt),
  });
  if (!firstUserMessage) {
    return;
  }
  const nextTitle = firstUserMessage.content.slice(0, 56).trim();
  if (!nextTitle) {
    return;
  }
  await db
    .update(conversations)
    .set({ title: nextTitle, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

export async function getDailyUsage(day: string) {
  const first = sqlite
    .prepare(`SELECT day, runs, api_calls FROM daily_usage WHERE day = ? LIMIT 1`)
    .get(day) as { day: string; runs: number; api_calls: number } | undefined;
  if (!first) {
    return { day, runs: 0, apiCalls: 0 };
  }
  return { day: first.day, runs: first.runs, apiCalls: first.api_calls };
}

export async function incrementDailyUsage(input: { day: string; runs: number; apiCalls: number }) {
  sqlite
    .prepare(`
      INSERT INTO daily_usage (day, runs, api_calls)
      VALUES (?, ?, ?)
      ON CONFLICT(day) DO UPDATE SET
        runs = runs + excluded.runs,
        api_calls = api_calls + excluded.api_calls
    `)
    .run(input.day, input.runs, input.apiCalls);
}
