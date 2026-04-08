/**
 * Clears all rows in daily_usage (runs + API call counters).
 * Run: npm run db:reset-usage
 */
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "multibot.db");
const db = new Database(dbPath);
const r = db.prepare("DELETE FROM daily_usage").run();
console.log(`Daily usage reset (${r.changes} row(s) removed).`);
db.close();
