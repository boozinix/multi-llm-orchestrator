import type { NextRequest } from "next/server";

function normalizeOrigin(input: string): string {
  try {
    const u = new URL(input);
    return u.origin.toLowerCase();
  } catch {
    return "";
  }
}

function configuredAllowedOrigins(req: NextRequest): string[] {
  const raw = (process.env.ALLOWED_ORIGINS ?? "").trim();
  if (!raw) {
    // Safe default: this host only.
    return [req.nextUrl.origin.toLowerCase()];
  }
  return raw
    .split(",")
    .map((s) => normalizeOrigin(s.trim()))
    .filter(Boolean);
}

/**
 * Allow requests with no Origin header (same-origin navigations, curl, native clients),
 * or Origin explicitly allowlisted.
 */
export function isAllowedRequestOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return configuredAllowedOrigins(req).includes(normalized);
}

