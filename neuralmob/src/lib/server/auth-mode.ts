import { isValidEmail, normalizeEmail } from "@/lib/auth";

export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() && process.env.CLERK_SECRET_KEY?.trim()
  );
}

export function isLocalOwnerBypassEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && !isClerkConfigured();
}

export function getLocalOwnerEmail(): string {
  const explicit = process.env.OWNER_EMAIL?.trim();
  if (explicit && isValidEmail(explicit)) return normalizeEmail(explicit);

  const fromUnlimited = (process.env.OWNER_UNLIMITED_EMAILS ?? "")
    .split(",")
    .map((value) => normalizeEmail(value))
    .find((value) => isValidEmail(value));
  if (fromUnlimited) return fromUnlimited;

  return "owner@local.neuralmob";
}
