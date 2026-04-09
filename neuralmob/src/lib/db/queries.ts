import { pg, sqlite, isPostgresMode } from "./client";
import { ensureDb } from "./init";
import { normalizeFlowConfig, normalizeModelConfig } from "../constants";
import type {
  ConversationRecord,
  ChatMessage,
  CreditReservationRecord,
  DailyUsage,
  FlowConfig,
  ModelConfig,
  BotRunOutput,
  UserRecord,
  UserTier,
  BillingEventRecord,
} from "../types";
import { DAILY_RUN_LIMIT, DAILY_API_CALL_LIMIT, FREE_STARTER_CREDIT_CENTS } from "../limits";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function newId(): string {
  return crypto.randomUUID();
}

type ConversationRow = {
  id: string;
  user_email: string;
  title: string;
  flow: string;
  models: string;
  created_at: number;
  updated_at: number;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  bot_outputs: string | null;
  created_at: number;
};

type UserRow = {
  id: string;
  email: string;
  tier: string;
  credit_balance_cents: number;
  reserved_credit_cents: number;
  lifetime_calls: number;
  created_at: number;
};

type BillingEventRow = {
  id: string;
  user_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_cents: number;
  created_at: number;
};

type DailyUsageRow = {
  date: string;
  runs: number;
  api_calls: number;
};

type CreditReservationRow = {
  id: string;
  user_id: string;
  reserved_cents: number;
  actual_cost_cents: number | null;
  status: "active" | "settled" | "released";
  created_at: number;
  finalized_at: number | null;
};

type CreditTopupRow = {
  id: string;
  user_id: string;
  provider_session_id: string;
  amount_cents: number;
  provider: string;
  status: string;
  created_at: number;
};

function mapConversation(row: ConversationRow): ConversationRecord {
  let flow: FlowConfig;
  let models: ModelConfig;
  try {
    flow = normalizeFlowConfig(JSON.parse(row.flow));
  } catch {
    flow = normalizeFlowConfig(null);
  }
  try {
    models = normalizeModelConfig(JSON.parse(row.models));
  } catch {
    models = normalizeModelConfig(null);
  }
  return {
    id: row.id,
    userEmail: row.user_email,
    title: row.title,
    flow,
    models,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function mapMessage(row: MessageRow): ChatMessage {
  let botOutputs: BotRunOutput[] | undefined;
  try {
    if (row.bot_outputs) botOutputs = JSON.parse(row.bot_outputs);
  } catch {
    /* ignore malformed historical rows */
  }
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as "user" | "assistant",
    content: row.content,
    botOutputs,
    createdAt: Number(row.created_at),
  };
}

function mapUser(row: UserRow): UserRecord {
  const tier: UserTier = row.tier === "paid" ? "paid" : "free";
  return {
    id: row.id,
    email: row.email,
    tier,
    creditBalanceCents: Number(row.credit_balance_cents),
    reservedCreditCents: Number(row.reserved_credit_cents),
    lifetimeCalls: Number(row.lifetime_calls),
    createdAt: Number(row.created_at),
  };
}

function mapBillingEvent(row: BillingEventRow): BillingEventRecord {
  return {
    id: row.id,
    userId: row.user_id,
    model: row.model,
    promptTokens: Number(row.prompt_tokens),
    completionTokens: Number(row.completion_tokens),
    costCents: Number(row.cost_cents),
    createdAt: Number(row.created_at),
  };
}

function mapCreditReservation(row: CreditReservationRow): CreditReservationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    reservedCents: Number(row.reserved_cents),
    actualCostCents: row.actual_cost_cents == null ? null : Number(row.actual_cost_cents),
    status: row.status,
    createdAt: Number(row.created_at),
    finalizedAt: row.finalized_at == null ? null : Number(row.finalized_at),
  };
}

function mustSqlite() {
  if (!sqlite) throw new Error("SQLite client not configured");
  return sqlite;
}

function mustPg() {
  if (!pg) throw new Error("Postgres client not configured");
  return pg;
}

// ── Conversations ───────────────────────────────────────────────────────────

export async function listConversationsForUser(userEmail: string): Promise<ConversationRecord[]> {
  await ensureDb();
  if (isPostgresMode()) {
    const rows = (await mustPg()`
      SELECT * FROM conversations
      WHERE user_email = ${userEmail}
      ORDER BY updated_at DESC
    `) as unknown as ConversationRow[];
    return rows.map(mapConversation);
  }
  const rows = mustSqlite()
    .prepare("SELECT * FROM conversations WHERE user_email = ? ORDER BY updated_at DESC")
    .all(userEmail) as ConversationRow[];
  return rows.map(mapConversation);
}

export async function getConversationForUser(id: string, userEmail: string): Promise<ConversationRecord | null> {
  await ensureDb();
  if (isPostgresMode()) {
    const rows = (await mustPg()`
      SELECT * FROM conversations
      WHERE id = ${id} AND user_email = ${userEmail}
      LIMIT 1
    `) as unknown as ConversationRow[];
    return rows[0] ? mapConversation(rows[0]) : null;
  }
  const row = mustSqlite()
    .prepare("SELECT * FROM conversations WHERE id = ? AND user_email = ?")
    .get(id, userEmail) as ConversationRow | null;
  return row ? mapConversation(row) : null;
}

export async function createConversationForUser(
  userEmail: string,
  flow: FlowConfig,
  models: ModelConfig
): Promise<ConversationRecord> {
  await ensureDb();
  const id = newId();
  const now = Date.now();
  if (isPostgresMode()) {
    const rows = (await mustPg()`
      INSERT INTO conversations (id, user_email, title, flow, models, created_at, updated_at)
      VALUES (${id}, ${userEmail}, ${"New Conversation"}, ${JSON.stringify(flow)}, ${JSON.stringify(models)}, ${now}, ${now})
      RETURNING *
    `) as unknown as ConversationRow[];
    return mapConversation(rows[0]!);
  }
  mustSqlite()
    .prepare(
      "INSERT INTO conversations (id, user_email, title, flow, models, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, userEmail, "New Conversation", JSON.stringify(flow), JSON.stringify(models), now, now);
  return (await getConversationForUser(id, userEmail))!;
}

export async function upsertConversationState(id: string, flow: FlowConfig, models: ModelConfig): Promise<void> {
  await ensureDb();
  const now = Date.now();
  if (isPostgresMode()) {
    await mustPg()`
      UPDATE conversations
      SET flow = ${JSON.stringify(flow)}, models = ${JSON.stringify(models)}, updated_at = ${now}
      WHERE id = ${id}
    `;
    return;
  }
  mustSqlite()
    .prepare("UPDATE conversations SET flow = ?, models = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(flow), JSON.stringify(models), now, id);
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  await ensureDb();
  const now = Date.now();
  if (isPostgresMode()) {
    await mustPg()`
      UPDATE conversations
      SET title = ${title}, updated_at = ${now}
      WHERE id = ${id}
    `;
    return;
  }
  mustSqlite()
    .prepare("UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?")
    .run(title, now, id);
}

export async function deleteConversationForUser(id: string, userEmail: string): Promise<void> {
  await ensureDb();
  if (isPostgresMode()) {
    await mustPg()`
      DELETE FROM conversations
      WHERE id = ${id} AND user_email = ${userEmail}
    `;
    return;
  }
  mustSqlite().prepare("DELETE FROM conversations WHERE id = ? AND user_email = ?").run(id, userEmail);
}

// ── Messages ────────────────────────────────────────────────────────────────

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  await ensureDb();
  if (isPostgresMode()) {
    const rows = (await mustPg()`
      SELECT * FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
    `) as unknown as MessageRow[];
    return rows.map(mapMessage);
  }
  const rows = mustSqlite()
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId) as MessageRow[];
  return rows.map(mapMessage);
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  botOutputs?: BotRunOutput[]
): Promise<ChatMessage> {
  await ensureDb();
  const id = newId();
  const now = Date.now();
  const botOutputsJson = botOutputs ? JSON.stringify(botOutputs) : null;
  if (isPostgresMode()) {
    await mustPg().begin(async (tx) => {
      await tx`
        INSERT INTO messages (id, conversation_id, role, content, bot_outputs, created_at)
        VALUES (${id}, ${conversationId}, ${role}, ${content}, ${botOutputsJson}, ${now})
      `;
      await tx`
        UPDATE conversations
        SET updated_at = ${now}
        WHERE id = ${conversationId}
      `;
    });
  } else {
    const db = mustSqlite();
    db.prepare(
      "INSERT INTO messages (id, conversation_id, role, content, bot_outputs, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(id, conversationId, role, content, botOutputsJson, now);
    db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(now, conversationId);
  }
  return { id, conversationId, role, content, botOutputs, createdAt: now };
}

// ── Daily usage ──────────────────────────────────────────────────────────────

export async function getDailyUsage(): Promise<DailyUsage> {
  await ensureDb();
  const date = todayStr();
  if (isPostgresMode()) {
    const rows = (await mustPg()`
      SELECT * FROM daily_usage
      WHERE date = ${date}
      LIMIT 1
    `) as unknown as DailyUsageRow[];
    const row = rows[0];
    return row ? { date: row.date, runs: Number(row.runs), apiCalls: Number(row.api_calls) } : { date, runs: 0, apiCalls: 0 };
  }
  const row = mustSqlite().prepare("SELECT * FROM daily_usage WHERE date = ?").get(date) as DailyUsageRow | null;
  return row ? { date: row.date, runs: Number(row.runs), apiCalls: Number(row.api_calls) } : { date, runs: 0, apiCalls: 0 };
}

export async function reserveDailyUsage(runsNeeded: number, apiCallsNeeded: number): Promise<boolean> {
  await ensureDb();
  const date = todayStr();
  if (isPostgresMode()) {
    return mustPg().begin(async (tx) => {
      const rows = (await tx`
        SELECT runs, api_calls
        FROM daily_usage
        WHERE date = ${date}
        FOR UPDATE
      `) as unknown as DailyUsageRow[];
      const row = rows[0];
      const currentRuns = Number(row?.runs ?? 0);
      const currentApiCalls = Number(row?.api_calls ?? 0);
      if (currentRuns + runsNeeded > DAILY_RUN_LIMIT) return false;
      if (currentApiCalls + apiCallsNeeded > DAILY_API_CALL_LIMIT) return false;
      await tx`
        INSERT INTO daily_usage (date, runs, api_calls)
        VALUES (${date}, ${runsNeeded}, ${apiCallsNeeded})
        ON CONFLICT (date)
        DO UPDATE SET
          runs = daily_usage.runs + EXCLUDED.runs,
          api_calls = daily_usage.api_calls + EXCLUDED.api_calls
      `;
      return true;
    });
  }

  const db = mustSqlite();
  const tx = db.transaction(() => {
    const row = db.prepare("SELECT runs, api_calls FROM daily_usage WHERE date = ?").get(date) as DailyUsageRow | null;
    const currentRuns = Number(row?.runs ?? 0);
    const currentApiCalls = Number(row?.api_calls ?? 0);
    if (currentRuns + runsNeeded > DAILY_RUN_LIMIT) return false;
    if (currentApiCalls + apiCallsNeeded > DAILY_API_CALL_LIMIT) return false;
    db.prepare(
      "INSERT INTO daily_usage (date, runs, api_calls) VALUES (?, ?, ?) ON CONFLICT(date) DO UPDATE SET runs = runs + excluded.runs, api_calls = api_calls + excluded.api_calls"
    ).run(date, runsNeeded, apiCallsNeeded);
    return true;
  });
  return tx() as boolean;
}

export async function clearDailyUsage(): Promise<number> {
  await ensureDb();
  if (isPostgresMode()) {
    const rows = await mustPg()`
      DELETE FROM daily_usage
      RETURNING date
    `;
    return rows.length;
  }
  const result = mustSqlite().prepare("DELETE FROM daily_usage").run();
  return result.changes;
}

// ── Users & billing ───────────────────────────────────────────────────────────

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  await ensureDb();
  if (isPostgresMode()) {
    const rows = (await mustPg()`
      SELECT * FROM users
      WHERE email = ${email}
      LIMIT 1
    `) as unknown as UserRow[];
    return rows[0] ? mapUser(rows[0]) : null;
  }
  const row = mustSqlite().prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | null;
  return row ? mapUser(row) : null;
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  await ensureDb();
  if (isPostgresMode()) {
    const rows = (await mustPg()`
      SELECT * FROM users
      WHERE id = ${id}
      LIMIT 1
    `) as unknown as UserRow[];
    return rows[0] ? mapUser(rows[0]) : null;
  }
  const row = mustSqlite().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | null;
  return row ? mapUser(row) : null;
}

export async function upsertUser(email: string): Promise<UserRecord> {
  await ensureDb();
  if (isPostgresMode()) {
    const id = newId();
    const now = Date.now();
    const rows = (await mustPg()`
      INSERT INTO users (id, email, tier, credit_balance_cents, reserved_credit_cents, lifetime_calls, created_at)
      VALUES (${id}, ${email}, ${"free"}, ${FREE_STARTER_CREDIT_CENTS}, ${0}, ${0}, ${now})
      ON CONFLICT (email)
      DO UPDATE SET email = EXCLUDED.email
      RETURNING *
    `) as unknown as UserRow[];
    const user = mapUser(rows[0]!);
    if (user.tier === "free" && user.creditBalanceCents === 0 && user.reservedCreditCents === 0 && user.lifetimeCalls === 0) {
      const toppedRows = (await mustPg()`
        UPDATE users
        SET credit_balance_cents = ${FREE_STARTER_CREDIT_CENTS}
        WHERE id = ${user.id}
        RETURNING *
      `) as unknown as UserRow[];
      return mapUser(toppedRows[0]!);
    }
    return user;
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    if (existing.tier === "free" && existing.creditBalanceCents === 0 && existing.reservedCreditCents === 0 && existing.lifetimeCalls === 0) {
      mustSqlite()
        .prepare("UPDATE users SET credit_balance_cents = ? WHERE id = ?")
        .run(FREE_STARTER_CREDIT_CENTS, existing.id);
      return (await getUserById(existing.id))!;
    }
    return existing;
  }
  const id = newId();
  const now = Date.now();
  mustSqlite()
    .prepare(
      "INSERT INTO users (id, email, tier, credit_balance_cents, reserved_credit_cents, lifetime_calls, created_at) VALUES (?, ?, 'free', ?, 0, 0, ?)"
    )
    .run(id, email, FREE_STARTER_CREDIT_CENTS, now);
  return (await getUserById(id))!;
}

export async function incrementLifetimeCalls(userId: string): Promise<void> {
  await ensureDb();
  if (isPostgresMode()) {
    await mustPg()`
      UPDATE users
      SET lifetime_calls = lifetime_calls + 1
      WHERE id = ${userId}
    `;
    return;
  }
  mustSqlite().prepare("UPDATE users SET lifetime_calls = lifetime_calls + 1 WHERE id = ?").run(userId);
}

export async function reserveCreditsForUser(
  userId: string,
  requestedCents: number
): Promise<CreditReservationRecord | null> {
  await ensureDb();
  const reserveCents = Math.max(1, Math.ceil(requestedCents));
  const reservationId = newId();
  const now = Date.now();

  if (isPostgresMode()) {
    return mustPg().begin(async (tx) => {
      const userRows = (await tx`
        SELECT credit_balance_cents, reserved_credit_cents
        FROM users
        WHERE id = ${userId}
        FOR UPDATE
      `) as unknown as Array<{ credit_balance_cents: number; reserved_credit_cents: number }>;
      const userRow = userRows[0];
      if (!userRow) throw new Error("User not found");
      const available = Number(userRow.credit_balance_cents) - Number(userRow.reserved_credit_cents);
      if (available < reserveCents) return null;
      await tx`
        INSERT INTO credit_reservations (id, user_id, reserved_cents, actual_cost_cents, status, created_at, finalized_at)
        VALUES (${reservationId}, ${userId}, ${reserveCents}, ${null}, ${"active"}, ${now}, ${null})
      `;
      await tx`
        UPDATE users
        SET reserved_credit_cents = reserved_credit_cents + ${reserveCents}
        WHERE id = ${userId}
      `;
      const rows = (await tx`
        SELECT * FROM credit_reservations
        WHERE id = ${reservationId}
        LIMIT 1
      `) as unknown as CreditReservationRow[];
      return rows[0] ? mapCreditReservation(rows[0]) : null;
    });
  }

  const db = mustSqlite();
  const tx = db.transaction(() => {
    const row = db.prepare("SELECT credit_balance_cents, reserved_credit_cents FROM users WHERE id = ?").get(userId) as
      | { credit_balance_cents: number; reserved_credit_cents: number }
      | undefined;
    if (!row) throw new Error("User not found");
    const available = Number(row.credit_balance_cents) - Number(row.reserved_credit_cents);
    if (available < reserveCents) return null;
    db.prepare(
      "INSERT INTO credit_reservations (id, user_id, reserved_cents, actual_cost_cents, status, created_at, finalized_at) VALUES (?, ?, ?, NULL, 'active', ?, NULL)"
    ).run(reservationId, userId, reserveCents, now);
    db.prepare("UPDATE users SET reserved_credit_cents = reserved_credit_cents + ? WHERE id = ?").run(reserveCents, userId);
    const created = db.prepare("SELECT * FROM credit_reservations WHERE id = ?").get(reservationId) as CreditReservationRow | undefined;
    return created ? mapCreditReservation(created) : null;
  });
  return tx() as CreditReservationRecord | null;
}

export async function releaseCreditReservation(userId: string, reservationId: string): Promise<number> {
  await ensureDb();
  const now = Date.now();
  if (isPostgresMode()) {
    return mustPg().begin(async (tx) => {
      const rows = (await tx`
        SELECT * FROM credit_reservations
        WHERE id = ${reservationId} AND user_id = ${userId}
        FOR UPDATE
      `) as unknown as CreditReservationRow[];
      const reservation = rows[0];
      if (!reservation || reservation.status !== "active") return 0;
      await tx`
        UPDATE credit_reservations
        SET status = ${"released"}, finalized_at = ${now}
        WHERE id = ${reservationId}
      `;
      await tx`
        UPDATE users
        SET reserved_credit_cents = GREATEST(0, reserved_credit_cents - ${reservation.reserved_cents})
        WHERE id = ${userId}
      `;
      return Number(reservation.reserved_cents);
    });
  }

  const db = mustSqlite();
  const tx = db.transaction(() => {
    const reservation = db
      .prepare("SELECT * FROM credit_reservations WHERE id = ? AND user_id = ?")
      .get(reservationId, userId) as CreditReservationRow | undefined;
    if (!reservation || reservation.status !== "active") return 0;
    db.prepare("UPDATE credit_reservations SET status = 'released', finalized_at = ? WHERE id = ?").run(now, reservationId);
    db.prepare("UPDATE users SET reserved_credit_cents = MAX(0, reserved_credit_cents - ?) WHERE id = ?").run(
      reservation.reserved_cents,
      userId
    );
    return Number(reservation.reserved_cents);
  });
  return tx() as number;
}

export async function insertBillingEvent(
  userId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  costCents: number
): Promise<void> {
  await ensureDb();
  const id = newId();
  const now = Date.now();
  if (isPostgresMode()) {
    await mustPg()`
      INSERT INTO billing_events (id, user_id, model, prompt_tokens, completion_tokens, cost_cents, created_at)
      VALUES (${id}, ${userId}, ${model}, ${promptTokens}, ${completionTokens}, ${costCents}, ${now})
    `;
    return;
  }
  mustSqlite()
    .prepare(
      "INSERT INTO billing_events (id, user_id, model, prompt_tokens, completion_tokens, cost_cents, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, userId, model, promptTokens, completionTokens, costCents, now);
}

export async function applyPaidUsage(
  userId: string,
  reservationId: string | null,
  lines: { model: string; promptTokens: number; completionTokens: number; costCents: number }[]
): Promise<{ newBalanceCents: number; totalDeductedCents: number }> {
  await ensureDb();
  if (isPostgresMode()) {
    return mustPg().begin(async (tx) => {
      const userRows = (await tx`
        SELECT credit_balance_cents, reserved_credit_cents
        FROM users
        WHERE id = ${userId}
        FOR UPDATE
      `) as unknown as Array<{ credit_balance_cents: number; reserved_credit_cents: number }>;
      const userRow = userRows[0];
      if (!userRow) throw new Error("User not found");
      let balance = Number(userRow.credit_balance_cents);
      let totalDeducted = 0;
      let reservationReserved = 0;
      if (reservationId) {
        const reservationRows = (await tx`
          SELECT * FROM credit_reservations
          WHERE id = ${reservationId} AND user_id = ${userId}
          FOR UPDATE
        `) as unknown as CreditReservationRow[];
        const reservation = reservationRows[0];
        if (!reservation || reservation.status !== "active") throw new Error("Credit reservation missing");
        reservationReserved = Number(reservation.reserved_cents);
      }
      for (const line of lines) {
        await tx`
          INSERT INTO billing_events (id, user_id, model, prompt_tokens, completion_tokens, cost_cents, created_at)
          VALUES (${newId()}, ${userId}, ${line.model}, ${line.promptTokens}, ${line.completionTokens}, ${line.costCents}, ${Date.now()})
        `;
        totalDeducted += line.costCents;
        balance = Math.max(0, balance - line.costCents);
      }
      await tx`
        UPDATE users
        SET
          credit_balance_cents = ${balance},
          reserved_credit_cents = GREATEST(0, reserved_credit_cents - ${reservationReserved})
        WHERE id = ${userId}
      `;
      if (reservationId) {
        await tx`
          UPDATE credit_reservations
          SET status = ${"settled"}, actual_cost_cents = ${totalDeducted}, finalized_at = ${Date.now()}
          WHERE id = ${reservationId}
        `;
      }
      if (totalDeducted > reservationReserved && reservationReserved > 0) {
        throw new Error("Run cost exceeded reserved credit; increase reservation estimate before production use.");
      }
      return { newBalanceCents: balance, totalDeductedCents: totalDeducted };
    });
  }

  const db = mustSqlite();
  let newBalance = 0;
  let totalDeducted = 0;
  const tx = db.transaction(() => {
    const row = db.prepare("SELECT credit_balance_cents, reserved_credit_cents FROM users WHERE id = ?").get(userId) as
      | { credit_balance_cents: number }
      | undefined;
    if (!row) throw new Error("User not found");
    let balance = Number(row.credit_balance_cents);
    let reservationReserved = 0;
    if (reservationId) {
      const reservation = db
        .prepare("SELECT * FROM credit_reservations WHERE id = ? AND user_id = ?")
        .get(reservationId, userId) as CreditReservationRow | undefined;
      if (!reservation || reservation.status !== "active") throw new Error("Credit reservation missing");
      reservationReserved = Number(reservation.reserved_cents);
    }
    for (const line of lines) {
      db.prepare(
        "INSERT INTO billing_events (id, user_id, model, prompt_tokens, completion_tokens, cost_cents, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(newId(), userId, line.model, line.promptTokens, line.completionTokens, line.costCents, Date.now());
      totalDeducted += line.costCents;
      balance = Math.max(0, balance - line.costCents);
    }
    if (totalDeducted > reservationReserved && reservationReserved > 0) {
      throw new Error("Run cost exceeded reserved credit; increase reservation estimate before production use.");
    }
    db.prepare("UPDATE users SET credit_balance_cents = ?, reserved_credit_cents = MAX(0, reserved_credit_cents - ?) WHERE id = ?").run(
      balance,
      reservationReserved,
      userId
    );
    if (reservationId) {
      db.prepare("UPDATE credit_reservations SET status = 'settled', actual_cost_cents = ?, finalized_at = ? WHERE id = ?").run(
        totalDeducted,
        Date.now(),
        reservationId
      );
    }
    newBalance = balance;
  });
  tx();
  return { newBalanceCents: newBalance, totalDeductedCents: totalDeducted };
}

export async function listRecentBillingEvents(userId: string, limit: number): Promise<BillingEventRecord[]> {
  await ensureDb();
  if (isPostgresMode()) {
    const rows = (await mustPg()`
      SELECT * FROM billing_events
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as unknown as BillingEventRow[];
    return rows.map(mapBillingEvent);
  }
  const rows = mustSqlite()
    .prepare("SELECT * FROM billing_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(userId, limit) as BillingEventRow[];
  return rows.map(mapBillingEvent);
}

export interface UserBillingSummary {
  user: UserRecord;
  recentEvents: BillingEventRecord[];
}

export async function getUserBillingSummary(email: string): Promise<UserBillingSummary | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  return {
    user,
    recentEvents: await listRecentBillingEvents(user.id, 10),
  };
}

export interface AdminDashboardUser extends UserRecord {
  availableCreditCents: number;
  totalSpentCents: number;
  eventCount: number;
  lastChargeAt: number | null;
}

export interface AdminDashboardSummary {
  totals: {
    userCount: number;
    freeUserCount: number;
    paidUserCount: number;
    totalCreditBalanceCents: number;
    totalReservedCreditCents: number;
    totalAvailableCreditCents: number;
    totalSpentCents: number;
    totalLifetimeCalls: number;
  };
  users: AdminDashboardUser[];
  recentEvents: BillingEventRecord[];
}

export async function applyCreditTopup(
  userId: string,
  providerSessionId: string,
  amountCents: number,
  provider = "stripe"
): Promise<{ applied: boolean; newBalanceCents: number }> {
  await ensureDb();
  const now = Date.now();
  const topupId = newId();

  if (isPostgresMode()) {
    return mustPg().begin(async (tx) => {
      const existingRows = (await tx`
        SELECT * FROM credit_topups
        WHERE provider_session_id = ${providerSessionId}
        LIMIT 1
      `) as unknown as CreditTopupRow[];
      if (existingRows[0]) {
        const user = await getUserById(userId);
        return { applied: false, newBalanceCents: user?.creditBalanceCents ?? 0 };
      }
      const userRows = (await tx`
        SELECT credit_balance_cents
        FROM users
        WHERE id = ${userId}
        FOR UPDATE
      `) as unknown as Array<{ credit_balance_cents: number }>;
      const userRow = userRows[0];
      if (!userRow) throw new Error("User not found");
      const newBalance = Number(userRow.credit_balance_cents) + amountCents;
      await tx`
        INSERT INTO credit_topups (id, user_id, provider_session_id, amount_cents, provider, status, created_at)
        VALUES (${topupId}, ${userId}, ${providerSessionId}, ${amountCents}, ${provider}, ${"completed"}, ${now})
      `;
      await tx`
        UPDATE users
        SET credit_balance_cents = ${newBalance}, tier = ${"paid"}
        WHERE id = ${userId}
      `;
      return { applied: true, newBalanceCents: newBalance };
    });
  }

  const db = mustSqlite();
  const tx = db.transaction(() => {
    const existing = db
      .prepare("SELECT * FROM credit_topups WHERE provider_session_id = ?")
      .get(providerSessionId) as CreditTopupRow | undefined;
    if (existing) {
      const user = db.prepare("SELECT credit_balance_cents FROM users WHERE id = ?").get(userId) as
        | { credit_balance_cents: number }
        | undefined;
      return { applied: false, newBalanceCents: Number(user?.credit_balance_cents ?? 0) };
    }
    const user = db.prepare("SELECT credit_balance_cents FROM users WHERE id = ?").get(userId) as
      | { credit_balance_cents: number }
      | undefined;
    if (!user) throw new Error("User not found");
    const newBalance = Number(user.credit_balance_cents) + amountCents;
    db.prepare(
      "INSERT INTO credit_topups (id, user_id, provider_session_id, amount_cents, provider, status, created_at) VALUES (?, ?, ?, ?, ?, 'completed', ?)"
    ).run(topupId, userId, providerSessionId, amountCents, provider, now);
    db.prepare("UPDATE users SET credit_balance_cents = ?, tier = 'paid' WHERE id = ?").run(newBalance, userId);
    return { applied: true, newBalanceCents: newBalance };
  });
  return tx() as { applied: boolean; newBalanceCents: number };
}

export async function listRecentBillingEventsGlobal(limit: number): Promise<BillingEventRecord[]> {
  await ensureDb();
  if (isPostgresMode()) {
    const rows = (await mustPg()`
      SELECT * FROM billing_events
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as unknown as BillingEventRow[];
    return rows.map(mapBillingEvent);
  }
  const rows = mustSqlite()
    .prepare("SELECT * FROM billing_events ORDER BY created_at DESC LIMIT ?")
    .all(limit) as BillingEventRow[];
  return rows.map(mapBillingEvent);
}

export async function getAdminDashboardSummary(limit = 100): Promise<AdminDashboardSummary> {
  await ensureDb();

  if (isPostgresMode()) {
    const totalRows = (await mustPg()`
      SELECT
        COUNT(*)::int AS user_count,
        COALESCE(SUM(CASE WHEN tier = 'free' THEN 1 ELSE 0 END), 0)::int AS free_user_count,
        COALESCE(SUM(CASE WHEN tier = 'paid' THEN 1 ELSE 0 END), 0)::int AS paid_user_count,
        COALESCE(SUM(credit_balance_cents), 0)::int AS total_credit_balance_cents,
        COALESCE(SUM(reserved_credit_cents), 0)::int AS total_reserved_credit_cents,
        COALESCE(SUM(lifetime_calls), 0)::int AS total_lifetime_calls
      FROM users
    `) as unknown as Array<{
      user_count: number;
      free_user_count: number;
      paid_user_count: number;
      total_credit_balance_cents: number;
      total_reserved_credit_cents: number;
      total_lifetime_calls: number;
    }>;
    const spentRows = (await mustPg()`
      SELECT COALESCE(SUM(cost_cents), 0)::int AS total_spent_cents
      FROM billing_events
    `) as unknown as Array<{ total_spent_cents: number }>;
    const userRows = (await mustPg()`
      SELECT
        u.*,
        COALESCE(stats.total_spent_cents, 0)::int AS total_spent_cents,
        COALESCE(stats.event_count, 0)::int AS event_count,
        stats.last_charge_at
      FROM users u
      LEFT JOIN (
        SELECT
          user_id,
          SUM(cost_cents) AS total_spent_cents,
          COUNT(*) AS event_count,
          MAX(created_at) AS last_charge_at
        FROM billing_events
        GROUP BY user_id
      ) stats ON stats.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT ${limit}
    `) as unknown as Array<
      UserRow & { total_spent_cents: number; event_count: number; last_charge_at: number | null }
    >;

    const totals = totalRows[0] ?? {
      user_count: 0,
      free_user_count: 0,
      paid_user_count: 0,
      total_credit_balance_cents: 0,
      total_reserved_credit_cents: 0,
      total_lifetime_calls: 0,
    };
    return {
      totals: {
        userCount: Number(totals.user_count),
        freeUserCount: Number(totals.free_user_count),
        paidUserCount: Number(totals.paid_user_count),
        totalCreditBalanceCents: Number(totals.total_credit_balance_cents),
        totalReservedCreditCents: Number(totals.total_reserved_credit_cents),
        totalAvailableCreditCents: Math.max(
          0,
          Number(totals.total_credit_balance_cents) - Number(totals.total_reserved_credit_cents)
        ),
        totalSpentCents: Number(spentRows[0]?.total_spent_cents ?? 0),
        totalLifetimeCalls: Number(totals.total_lifetime_calls),
      },
      users: userRows.map((row) => {
        const user = mapUser(row);
        return {
          ...user,
          availableCreditCents: Math.max(0, user.creditBalanceCents - user.reservedCreditCents),
          totalSpentCents: Number(row.total_spent_cents ?? 0),
          eventCount: Number(row.event_count ?? 0),
          lastChargeAt: row.last_charge_at == null ? null : Number(row.last_charge_at),
        };
      }),
      recentEvents: await listRecentBillingEventsGlobal(25),
    };
  }

  const db = mustSqlite();
  const totals = db
    .prepare(
      `SELECT
        COUNT(*) AS user_count,
        COALESCE(SUM(CASE WHEN tier = 'free' THEN 1 ELSE 0 END), 0) AS free_user_count,
        COALESCE(SUM(CASE WHEN tier = 'paid' THEN 1 ELSE 0 END), 0) AS paid_user_count,
        COALESCE(SUM(credit_balance_cents), 0) AS total_credit_balance_cents,
        COALESCE(SUM(reserved_credit_cents), 0) AS total_reserved_credit_cents,
        COALESCE(SUM(lifetime_calls), 0) AS total_lifetime_calls
      FROM users`
    )
    .get() as {
    user_count: number;
    free_user_count: number;
    paid_user_count: number;
    total_credit_balance_cents: number;
    total_reserved_credit_cents: number;
    total_lifetime_calls: number;
  };
  const spent = db
    .prepare("SELECT COALESCE(SUM(cost_cents), 0) AS total_spent_cents FROM billing_events")
    .get() as { total_spent_cents: number };
  const userRows = db
    .prepare(
      `SELECT
        u.*,
        COALESCE(stats.total_spent_cents, 0) AS total_spent_cents,
        COALESCE(stats.event_count, 0) AS event_count,
        stats.last_charge_at
      FROM users u
      LEFT JOIN (
        SELECT
          user_id,
          SUM(cost_cents) AS total_spent_cents,
          COUNT(*) AS event_count,
          MAX(created_at) AS last_charge_at
        FROM billing_events
        GROUP BY user_id
      ) stats ON stats.user_id = u.id
      ORDER BY u.created_at DESC
      LIMIT ?`
    )
    .all(limit) as Array<UserRow & { total_spent_cents: number; event_count: number; last_charge_at: number | null }>;

  return {
    totals: {
      userCount: Number(totals.user_count ?? 0),
      freeUserCount: Number(totals.free_user_count ?? 0),
      paidUserCount: Number(totals.paid_user_count ?? 0),
      totalCreditBalanceCents: Number(totals.total_credit_balance_cents ?? 0),
      totalReservedCreditCents: Number(totals.total_reserved_credit_cents ?? 0),
      totalAvailableCreditCents: Math.max(
        0,
        Number(totals.total_credit_balance_cents ?? 0) - Number(totals.total_reserved_credit_cents ?? 0)
      ),
      totalSpentCents: Number(spent.total_spent_cents ?? 0),
      totalLifetimeCalls: Number(totals.total_lifetime_calls ?? 0),
    },
    users: userRows.map((row) => {
      const user = mapUser(row);
      return {
        ...user,
        availableCreditCents: Math.max(0, user.creditBalanceCents - user.reservedCreditCents),
        totalSpentCents: Number(row.total_spent_cents ?? 0),
        eventCount: Number(row.event_count ?? 0),
        lastChargeAt: row.last_charge_at == null ? null : Number(row.last_charge_at),
      };
    }),
    recentEvents: await listRecentBillingEventsGlobal(25),
  };
}
