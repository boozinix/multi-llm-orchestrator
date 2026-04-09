import Stripe from "stripe";
import type { NextRequest } from "next/server";

export const STRIPE_TOPUP_OPTIONS_CENTS = [500, 1000, 2000] as const;

export function stripeServer(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  return new Stripe(secretKey, {
    apiVersion: "2026-03-25.dahlia",
  });
}

export function stripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");
  return secret;
}

export function isAllowedTopupAmount(amountCents: number): boolean {
  return STRIPE_TOPUP_OPTIONS_CENTS.includes(amountCents as (typeof STRIPE_TOPUP_OPTIONS_CENTS)[number]);
}

export function appBaseUrl(req: NextRequest): string {
  const envBase = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_BASE_URL?.trim();
  if (envBase) return envBase.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
