import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, isAllowedEmail } from "@/lib/auth";

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/api/auth/login");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const email = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? "";
  if (!email || !isAllowedEmail(email)) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
