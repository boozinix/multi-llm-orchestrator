import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isValidEmail } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

/** Reject huge JSON bodies early when Content-Length is sent (typical for fetch). */
const MAX_API_BODY_BYTES = 512 * 1024;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/api/") &&
    (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")
  ) {
    const raw = req.headers.get("content-length");
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n > MAX_API_BODY_BYTES) {
        return NextResponse.json({ error: "Request body too large" }, { status: 413 });
      }
    }
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

  const raw = req.cookies.get(AUTH_COOKIE_NAME)?.value?.trim() ?? "";
  const authed = raw.length > 0 && isValidEmail(raw);

  if (!authed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
