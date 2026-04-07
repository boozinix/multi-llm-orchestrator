export const ALLOWED_EMAIL = "zubair@example.com";
export const AUTH_COOKIE_NAME = "multibot_email";

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isAllowedEmail(email: string) {
  return normalizeEmail(email) === normalizeEmail(ALLOWED_EMAIL);
}
