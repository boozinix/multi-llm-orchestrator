import type { NextRequest } from "next/server";

function normalizeOrigin(input: string): string {
  try {
    const u = new URL(input);
    return u.origin.toLowerCase();
  } catch {
    return "";
  }
}

/** Every hostname the edge saw for this request (Vercel may send several in X-Forwarded-Host). */
function collectRequestHosts(req: NextRequest): string[] {
  const out: string[] = [];
  const xf = req.headers.get("x-forwarded-host");
  if (xf) {
    for (const part of xf.split(",")) {
      const h = part.trim();
      if (h) out.push(h);
    }
  }
  const host = req.headers.get("host")?.trim();
  if (host) out.push(host);
  return [...new Set(out)];
}

/**
 * Origins implied by how the request reached this deployment (Vercel custom domain,
 * preview URL, etc.). Edge `nextUrl` can disagree with the browser's `Origin` header;
 * `Host` / `X-Forwarded-Host` reflect the URL the user actually hit.
 */
function requestPublicOrigins(req: NextRequest): string[] {
  const hosts = collectRequestHosts(req);
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1"
      ? "http"
      : "https");

  const origins = new Set<string>();
  for (const h of hosts) {
    const primary = normalizeOrigin(`${proto}://${h}`);
    if (primary) origins.add(primary);
    // Wrong x-forwarded-proto (http behind TLS) would miss https://… — add https for non-local hosts.
    const isLocal =
      h.startsWith("localhost:") ||
      h === "localhost" ||
      h.startsWith("127.0.0.1:") ||
      h === "127.0.0.1";
    if (proto === "http" && !isLocal) {
      const asHttps = normalizeOrigin(`https://${h}`);
      if (asHttps) origins.add(asHttps);
    }
  }
  const next = normalizeOrigin(req.nextUrl.origin);
  if (next) origins.add(next);

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const o = normalizeOrigin(`https://${vercelUrl}`);
    if (o) origins.add(o);
  }

  return [...origins];
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

