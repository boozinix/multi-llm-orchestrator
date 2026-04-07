import { sqlite } from "./client";
import { ensureDb } from "./init";
import { normalizeFlowConfig, normalizeModelConfig } from "../constants";
import type { ConversationRecord, ChatMessage, DailyUsage, FlowConfig, ModelConfig, BotRunOutput } from "../types";
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
