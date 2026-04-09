import { auth, currentUser } from "@clerk/nextjs/server";
import { isValidEmail, normalizeEmail } from "../auth";
import { getLocalOwnerEmail, isLocalOwnerBypassEnabled } from "./auth-mode";

export async function requireSessionEmail(): Promise<string | null> {
  if (isLocalOwnerBypassEnabled()) {
    return getLocalOwnerEmail();
  }
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const raw = user?.primaryEmailAddress?.emailAddress?.trim() ?? "";
  if (!raw || !isValidEmail(raw)) return null;
  return normalizeEmail(raw);
}
