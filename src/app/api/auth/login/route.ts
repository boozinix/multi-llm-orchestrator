import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE_NAME, isAllowedEmail, normalizeEmail } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const raw = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isAllowedEmail(email)) {
    return NextResponse.json({ error: "Email is not authorized." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: email,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
