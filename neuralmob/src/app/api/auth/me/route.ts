import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, isValidEmail } from "@/lib/auth";

export async function GET() {
  const raw = (await cookies()).get(AUTH_COOKIE_NAME)?.value?.trim() ?? "";
  const ok = raw.length > 0 && isValidEmail(raw);
  return NextResponse.json({ authenticated: ok, email: ok ? raw : null });
}
