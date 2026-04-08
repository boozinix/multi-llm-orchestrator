import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, isValidEmail, normalizeEmail } from "../auth";

export async function requireSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const emailCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const raw = emailCookie?.value?.trim() ?? "";
  if (!raw || !isValidEmail(raw)) return null;
  return normalizeEmail(raw);
}
