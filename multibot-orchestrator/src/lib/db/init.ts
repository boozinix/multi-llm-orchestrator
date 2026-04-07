import { sqlite } from "./client";

let initialized = false;

export function ensureDb() {
  if (initialized) return;

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
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
  `);

  initialized = true;
}
