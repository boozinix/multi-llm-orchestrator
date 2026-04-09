import { auth, currentUser } from "@clerk/nextjs/server";
import { isValidEmail, normalizeEmail } from "../auth";

export async function requireSessionEmail(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const raw = user?.primaryEmailAddress?.emailAddress?.trim() ?? "";
  if (!raw || !isValidEmail(raw)) return null;
  return normalizeEmail(raw);
}
