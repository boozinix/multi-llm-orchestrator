export const AUTH_COOKIE_NAME = "multibot_email";

export const ALLOWED_EMAILS: string[] = [
  "boozinix@gmail.com",
  "sh.zubair.nizami@gmail.com",
  "shafiquzma7@gmail.com",
];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAllowedEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return ALLOWED_EMAILS.map(normalizeEmail).includes(normalized);
}
