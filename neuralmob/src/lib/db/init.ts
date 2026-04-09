import { isPostgresMode, pg, sqlite } from "./client";

let initialized: Promise<void> | null = null;

export async function ensureDb() {
  if (!initialized) {
    initialized = isPostgresMode() ? ensurePostgresDb() : ensureSqliteDb();
  }
  await initialized;
}

async function ensurePostgresDb() {
  if (!pg) throw new Error("Postgres client not configured");

  await pg`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT 'New Conversation',
      flow TEXT NOT NULL,
      models TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `;
  await pg`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      bot_outputs TEXT,
      created_at BIGINT NOT NULL
    )
  `;
  await pg`
    CREATE TABLE IF NOT EXISTS daily_usage (
      date TEXT PRIMARY KEY,
      runs INTEGER NOT NULL DEFAULT 0,
      api_calls INTEGER NOT NULL DEFAULT 0
    )
  `;
  await pg`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      tier TEXT NOT NULL DEFAULT 'free' CHECK(tier IN ('free', 'paid')),
      credit_balance_cents INTEGER NOT NULL DEFAULT 0,
      reserved_credit_cents INTEGER NOT NULL DEFAULT 0,
      lifetime_calls INTEGER NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL
    )
  `;
  await pg`
    CREATE TABLE IF NOT EXISTS billing_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      cost_cents INTEGER NOT NULL,
      created_at BIGINT NOT NULL
    )
  `;
  await pg`
    CREATE TABLE IF NOT EXISTS credit_reservations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      reserved_cents INTEGER NOT NULL,
      actual_cost_cents INTEGER,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'settled', 'released')),
      created_at BIGINT NOT NULL,
      finalized_at BIGINT
    )
  `;
  await pg`
    CREATE TABLE IF NOT EXISTS credit_topups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      provider_session_id TEXT NOT NULL UNIQUE,
      amount_cents INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'stripe',
      status TEXT NOT NULL DEFAULT 'completed',
      created_at BIGINT NOT NULL
    )
  `;
  await pg`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_email TEXT NOT NULL DEFAULT ''`;
  await pg`ALTER TABLE users ADD COLUMN IF NOT EXISTS reserved_credit_cents INTEGER NOT NULL DEFAULT 0`;
  await pg`CREATE INDEX IF NOT EXISTS conversations_user_email_updated_at_idx ON conversations(user_email, updated_at DESC)`;
  await pg`CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx ON messages(conversation_id, created_at ASC)`;
  await pg`CREATE INDEX IF NOT EXISTS billing_events_user_id_created_at_idx ON billing_events(user_id, created_at DESC)`;
  await pg`CREATE INDEX IF NOT EXISTS credit_reservations_user_id_status_created_at_idx ON credit_reservations(user_id, status, created_at DESC)`;
  await pg`CREATE INDEX IF NOT EXISTS credit_topups_user_id_created_at_idx ON credit_topups(user_id, created_at DESC)`;
}

async function ensureSqliteDb() {
  if (!sqlite) throw new Error("SQLite client not configured");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT 'New Conversation',
      flow TEXT NOT NULL,
      models TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      bot_outputs TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_usage (
      date TEXT PRIMARY KEY,
      runs INTEGER NOT NULL DEFAULT 0,
      api_calls INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      tier TEXT NOT NULL DEFAULT 'free' CHECK(tier IN ('free', 'paid')),
      credit_balance_cents INTEGER NOT NULL DEFAULT 0,
      reserved_credit_cents INTEGER NOT NULL DEFAULT 0,
      lifetime_calls INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS billing_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      cost_cents INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credit_reservations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      reserved_cents INTEGER NOT NULL,
      actual_cost_cents INTEGER,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'settled', 'released')),
      created_at INTEGER NOT NULL,
      finalized_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS credit_topups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      provider_session_id TEXT NOT NULL UNIQUE,
      amount_cents INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'stripe',
      status TEXT NOT NULL DEFAULT 'completed',
      created_at INTEGER NOT NULL
    );
  `);

  const conversationColumns = sqlite
    .prepare("PRAGMA table_info(conversations)")
    .all() as { name: string }[];
  if (!conversationColumns.some((column) => column.name === "user_email")) {
    sqlite.exec("ALTER TABLE conversations ADD COLUMN user_email TEXT NOT NULL DEFAULT '';");
  }
  const userColumns = sqlite.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userColumns.some((column) => column.name === "reserved_credit_cents")) {
    sqlite.exec("ALTER TABLE users ADD COLUMN reserved_credit_cents INTEGER NOT NULL DEFAULT 0;");
  }
  sqlite.exec(
    "CREATE INDEX IF NOT EXISTS conversations_user_email_updated_at_idx ON conversations(user_email, updated_at DESC);"
  );
  sqlite.exec(
    "CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx ON messages(conversation_id, created_at ASC);"
  );
  sqlite.exec(
    "CREATE INDEX IF NOT EXISTS billing_events_user_id_created_at_idx ON billing_events(user_id, created_at DESC);"
  );
  sqlite.exec(
    "CREATE INDEX IF NOT EXISTS credit_reservations_user_id_status_created_at_idx ON credit_reservations(user_id, status, created_at DESC);"
  );
  sqlite.exec(
    "CREATE INDEX IF NOT EXISTS credit_topups_user_id_created_at_idx ON credit_topups(user_id, created_at DESC);"
  );
}
