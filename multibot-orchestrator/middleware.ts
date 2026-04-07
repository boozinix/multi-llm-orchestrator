import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isAllowedEmail } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic) return NextResponse.next();

  const email = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authed = email && isAllowedEmail(email);

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
