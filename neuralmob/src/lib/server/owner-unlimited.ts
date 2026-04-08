import { normalizeEmail } from "@/lib/auth";

/**
 * Comma-separated emails in OWNER_UNLIMITED_EMAILS (or single OWNER_EMAIL) skip
 * production billing gates and are never charged — set only in server env (e.g. Vercel).
 */
export function ownerUnlimitedEmailSet(): Set<string> {
  const primary = (process.env.OWNER_UNLIMITED_EMAILS ?? "").trim();
  const legacy = (process.env.OWNER_EMAIL ?? "").trim();
  const raw = [primary, legacy].filter(Boolean).join(",");
  const set = new Set<string>();
  for (const part of raw.split(",")) {
    const n = normalizeEmail(part);
    if (n) set.add(n);
  }
  return set;
}

export function isOwnerUnlimitedEmail(email: string): boolean {
  if (!email) return false;
  return ownerUnlimitedEmailSet().has(normalizeEmail(email));
}
