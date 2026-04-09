import Database from "better-sqlite3";
import os from "os";
import path from "path";
import postgres from "postgres";

const POSTGRES_URL =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  process.env.POSTGRES_PRISMA_URL?.trim() ||
  "";

function dbFilePath(): string {
  return path.join(process.cwd(), "multibot.db");
}

function postgresNeedsSsl(url: string): boolean {
  return !/(localhost|127\.0\.0\.1)/i.test(url) && process.env.POSTGRES_SSL_DISABLE !== "1";
}

export function isPostgresMode(): boolean {
  return POSTGRES_URL.length > 0;
}

export const pg = isPostgresMode()
  ? postgres(POSTGRES_URL, {
      max: 1,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 15,
      ssl: postgresNeedsSsl(POSTGRES_URL) ? "require" : undefined,
    })
  : null;

export const sqlite = isPostgresMode() ? null : new Database(dbFilePath());

if (sqlite) {
  sqlite.pragma("foreign_keys = ON");
}

export function runtimeDbLabel(): "postgres" | "sqlite" {
  return isPostgresMode() ? "postgres" : "sqlite";
}

export function localTempDbPathForReference(): string {
  return path.join(os.tmpdir(), "neuralmob.db");
}
