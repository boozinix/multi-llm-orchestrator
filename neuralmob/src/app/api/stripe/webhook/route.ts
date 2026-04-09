import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { applyCreditTopup } from "@/lib/db/queries";
import { stripeServer, stripeWebhookSecret } from "@/lib/server/stripe";

export const runtime = "nodejs";

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId?.trim() ?? session.client_reference_id?.trim() ?? "";
  const creditCents = Number(session.metadata?.creditCents ?? session.amount_total ?? 0);
  if (!userId || !Number.isFinite(creditCents) || creditCents <= 0) {
    throw new Error("Invalid checkout session metadata");
  }
  return applyCreditTopup(userId, session.id, Math.round(creditCents), "stripe");
}

export async function POST(req: NextRequest) {
  const stripe = stripeServer();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}
