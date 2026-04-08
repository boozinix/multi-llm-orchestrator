import type { NextRequest } from "next/server";

function normalizeOrigin(input: string): string {
  try {
    const u = new URL(input);
    return u.origin.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Origins implied by how the request reached this deployment (Vercel custom domain,
 * preview URL, etc.). Edge `nextUrl` can disagree with the browser's `Origin` header;
 * `Host` / `X-Forwarded-Host` reflect the URL the user actually hit.
 */
function requestPublicOrigins(req: NextRequest): string[] {
  const hostHeader = req.headers.get("host")?.trim() ?? "";
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1"
      ? "http"
      : "https");

  const hosts = [...new Set([xfHost, hostHeader].filter(Boolean))];
  const fromHeaders = hosts
    .map((h) => normalizeOrigin(`${proto}://${h}`))
    .filter(Boolean);
  const next = normalizeOrigin(req.nextUrl.origin);
  return [...new Set([...(next ? [next] : []), ...fromHeaders])];
}

function configuredAllowedOrigins(req: NextRequest): string[] {
  const fromRequest = new Set(requestPublicOrigins(req));
  const raw = (process.env.ALLOWED_ORIGINS ?? "").trim();
  if (raw) {
    for (const o of raw
      .split(",")
      .map((s) => normalizeOrigin(s.trim()))
      .filter(Boolean)) {
      fromRequest.add(o);
    }
  }
  return [...fromRequest];
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

