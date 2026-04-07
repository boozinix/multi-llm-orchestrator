import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, isAllowedEmail } from "../auth";

export async function requireSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const emailCookie = cookieStore.get(AUTH_COOKIE_NAME);
  if (!emailCookie?.value) return null;
  if (!isAllowedEmail(emailCookie.value)) return null;
  return emailCookie.value;
}
