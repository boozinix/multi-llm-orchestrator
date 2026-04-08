import { sqlite } from "./client";
import { ensureDb } from "./init";
import { normalizeFlowConfig, normalizeModelConfig } from "../constants";
import type {
  ConversationRecord,
  ChatMessage,
  DailyUsage,
  FlowConfig,
  ModelConfig,
  BotRunOutput,
  UserRecord,
  UserTier,
  BillingEventRecord,
} from "../types";
import { DAILY_RUN_LIMIT, DAILY_API_CALL_LIMIT } from "../limits";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function newId(): string {
  return crypto.randomUUID();
}

// ── Conversations ───────────────────────────────────────────────────────────

export function listConversations(): ConversationRecord[] {
  ensureDb();
  const rows = sqlite.prepare("SELECT * FROM conversations ORDER BY updated_at DESC").all() as {
    id: string; title: string; flow: string; models: string; created_at: number; updated_at: number;
  }[];
  return rows.map(mapConversation);
}

export function getConversation(id: string): ConversationRecord | null {
  ensureDb();
  const row = sqlite.prepare("SELECT * FROM conversations WHERE id = ?").get(id) as {
    id: string; title: string; flow: string; models: string; created_at: number; updated_at: number;
  } | null;
  return row ? mapConversation(row) : null;
}

export function createConversation(flow: FlowConfig, models: ModelConfig): ConversationRecord {
  ensureDb();
  const id = newId();
  const now = Date.now();
  sqlite.prepare(
    "INSERT INTO conversations (id, title, flow, models, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, "New Conversation", JSON.stringify(flow), JSON.stringify(models), now, now);
  return getConversation(id)!;
}

export function upsertConversationState(id: string, flow: FlowConfig, models: ModelConfig): void {
  ensureDb();
  sqlite.prepare(
    "UPDATE conversations SET flow = ?, models = ?, updated_at = ? WHERE id = ?"
  ).run(JSON.stringify(flow), JSON.stringify(models), Date.now(), id);
}

export function updateConversationTitle(id: string, title: string): void {
  ensureDb();
  sqlite.prepare("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?").run(title, Date.now(), id);
}

export function deleteConversation(id: string): void {
  ensureDb();
  sqlite.prepare("DELETE FROM conversations WHERE id = ?").run(id);
}

function mapConversation(row: { id: string; title: string; flow: string; models: string; created_at: number; updated_at: number }): ConversationRecord {
  let flow: FlowConfig;
  let models: ModelConfig;
  try { flow = normalizeFlowConfig(JSON.parse(row.flow)); } catch { flow = normalizeFlowConfig(null); }
  try { models = normalizeModelConfig(JSON.parse(row.models)); } catch { models = normalizeModelConfig(null); }
  return { id: row.id, title: row.title, flow, models, createdAt: row.created_at, updatedAt: row.updated_at };
}

// ── Messages ────────────────────────────────────────────────────────────────

export function getMessages(conversationId: string): ChatMessage[] {
  ensureDb();
  const rows = sqlite.prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(conversationId) as {
    id: string; conversation_id: string; role: string; content: string; bot_outputs: string | null; created_at: number;
  }[];
  return rows.map(mapMessage);
}

export function addMessage(conversationId: string, role: "user" | "assistant", content: string, botOutputs?: BotRunOutput[]): ChatMessage {
  ensureDb();
  const id = newId();
  const now = Date.now();
  sqlite.prepare(
    "INSERT INTO messages (id, conversation_id, role, content, bot_outputs, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, conversationId, role, content, botOutputs ? JSON.stringify(botOutputs) : null, now);
  sqlite.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(now, conversationId);
  return { id, conversationId, role: role as "user" | "assistant", content, botOutputs, createdAt: now };
}

function mapMessage(row: { id: string; conversation_id: string; role: string; content: string; bot_outputs: string | null; created_at: number }): ChatMessage {
  let botOutputs: BotRunOutput[] | undefined;
  try { if (row.bot_outputs) botOutputs = JSON.parse(row.bot_outputs); } catch { /* ignore */ }
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as "user" | "assistant",
    content: row.content,
    botOutputs,
    createdAt: row.created_at,
  };
}

// ── Daily usage ──────────────────────────────────────────────────────────────

export function getDailyUsage(): DailyUsage {
  ensureDb();
  const row = sqlite.prepare("SELECT * FROM daily_usage WHERE date = ?").get(todayStr()) as { date: string; runs: number; api_calls: number } | null;
  return row ? { date: row.date, runs: row.runs, apiCalls: row.api_calls } : { date: todayStr(), runs: 0, apiCalls: 0 };
}

/**
 * Atomically reserves usage quota. Returns true if the reservation succeeded,
 * false if daily limits would be exceeded.
 */
export function reserveDailyUsage(runsNeeded: number, apiCallsNeeded: number): boolean {
  ensureDb();
  const date = todayStr();

  const tx = sqlite.transaction(() => {
    const row = sqlite.prepare("SELECT runs, api_calls FROM daily_usage WHERE date = ?").get(date) as { runs: number; api_calls: number } | null;
    const currentRuns = row?.runs ?? 0;
    const currentApiCalls = row?.api_calls ?? 0;

    if (currentRuns + runsNeeded > DAILY_RUN_LIMIT) return false;
    if (currentApiCalls + apiCallsNeeded > DAILY_API_CALL_LIMIT) return false;

    sqlite.prepare(
      "INSERT INTO daily_usage (date, runs, api_calls) VALUES (?, ?, ?) ON CONFLICT(date) DO UPDATE SET runs = runs + excluded.runs, api_calls = api_calls + excluded.api_calls"
    ).run(date, runsNeeded, apiCallsNeeded);

    return true;
  });

  return tx() as boolean;
}

// ── Users & billing ───────────────────────────────────────────────────────────

function mapUser(row: {
  id: string;
  email: string;
  tier: string;
  credit_balance_cents: number;
  lifetime_calls: number;
  created_at: number;
}): UserRecord {
  const tier: UserTier = row.tier === "paid" ? "paid" : "free";
  return {
    id: row.id,
    email: row.email,
    tier,
    creditBalanceCents: row.credit_balance_cents,
    lifetimeCalls: row.lifetime_calls,
    createdAt: row.created_at,
  };
}

export function getUserByEmail(email: string): UserRecord | null {
  ensureDb();
  const row = sqlite.prepare("SELECT * FROM users WHERE email = ?").get(email) as {
    id: string;
    email: string;
    tier: string;
    credit_balance_cents: number;
    lifetime_calls: number;
    created_at: number;
  } | null;
  return row ? mapUser(row) : null;
}

export function getUserById(id: string): UserRecord | null {
  ensureDb();
  const row = sqlite.prepare("SELECT * FROM users WHERE id = ?").get(id) as {
    id: string;
    email: string;
    tier: string;
    credit_balance_cents: number;
    lifetime_calls: number;
    created_at: number;
  } | null;
  return row ? mapUser(row) : null;
}

/** Create or return existing user row for this email (stable id per email). */
export function upsertUser(email: string): UserRecord {
  ensureDb();
  const existing = getUserByEmail(email);
  if (existing) return existing;
  const id = newId();
  const now = Date.now();
  sqlite.prepare(
    "INSERT INTO users (id, email, tier, credit_balance_cents, lifetime_calls, created_at) VALUES (?, ?, 'free', 0, 0, ?)"
  ).run(id, email, now);
  return getUserById(id)!;
}

export function incrementLifetimeCalls(userId: string): void {
  ensureDb();
  sqlite.prepare("UPDATE users SET lifetime_calls = lifetime_calls + 1 WHERE id = ?").run(userId);
}

export function insertBillingEvent(
  userId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  costCents: number
): void {
  ensureDb();
  const id = newId();
  const now = Date.now();
  sqlite.prepare(
    "INSERT INTO billing_events (id, user_id, model, prompt_tokens, completion_tokens, cost_cents, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(id, userId, model, promptTokens, completionTokens, costCents, now);
}

/** Insert events and deduct balance in one transaction. Clamps balance at 0. */
export function applyPaidUsage(
  userId: string,
  lines: { model: string; promptTokens: number; completionTokens: number; costCents: number }[]
): { newBalanceCents: number; totalDeductedCents: number } {
  ensureDb();
  let newBalance = 0;
  let totalDeducted = 0;

  const tx = sqlite.transaction(() => {
    const row = sqlite.prepare("SELECT credit_balance_cents FROM users WHERE id = ?").get(userId) as
      | { credit_balance_cents: number }
      | undefined;
    if (!row) throw new Error("User not found");
    let balance = row.credit_balance_cents;
    for (const line of lines) {
      insertBillingEvent(userId, line.model, line.promptTokens, line.completionTokens, line.costCents);
      totalDeducted += line.costCents;
      balance = Math.max(0, balance - line.costCents);
    }
    sqlite.prepare("UPDATE users SET credit_balance_cents = ? WHERE id = ?").run(balance, userId);
    newBalance = balance;
  });

  tx();
  return { newBalanceCents: newBalance, totalDeductedCents: totalDeducted };
}

export function listRecentBillingEvents(userId: string, limit: number): BillingEventRecord[] {
  ensureDb();
  const rows = sqlite
    .prepare(
      "SELECT * FROM billing_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
    )
    .all(userId, limit) as {
    id: string;
    user_id: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    cost_cents: number;
    created_at: number;
  }[];
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    model: r.model,
    promptTokens: r.prompt_tokens,
    completionTokens: r.completion_tokens,
    costCents: r.cost_cents,
    createdAt: r.created_at,
  }));
}

export interface UserBillingSummary {
  user: UserRecord;
  recentEvents: BillingEventRecord[];
}

export function getUserBillingSummary(email: string): UserBillingSummary | null {
  const user = getUserByEmail(email);
  if (!user) return null;
  return {
    user,
    recentEvents: listRecentBillingEvents(user.id, 10),
  };
}
