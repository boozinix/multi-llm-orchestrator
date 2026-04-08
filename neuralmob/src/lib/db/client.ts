import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import os from "os";
import path from "path";

/** Vercel/AWS serverless FS is read-only except os.tmpdir(); local dev uses project root. */
function dbFilePath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "neuralmob.db");
  }
  return path.join(process.cwd(), "multibot.db");
}

const DB_PATH = dbFilePath();

export const sqlite = new Database(DB_PATH);
sqlite.pragma("foreign_keys = ON");
export const db = drizzle(sqlite, { schema });
