import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isValidEmail, normalizeEmail } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const raw = typeof body.email === "string" ? body.email : "";
  const email = normalizeEmail(raw);

  if (!email || !isValidEmail(raw)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
