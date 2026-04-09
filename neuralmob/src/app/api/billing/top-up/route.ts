import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionEmail } from "@/lib/server/session";
import { upsertUser } from "@/lib/db/queries";
import { appBaseUrl, isAllowedTopupAmount, stripeServer } from "@/lib/server/stripe";
import { isOwnerUnlimitedEmail } from "@/lib/server/owner-unlimited";

const schema = z.object({
  amountCents: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isOwnerUnlimitedEmail(email)) {
    return NextResponse.json({ error: "Owner account does not need top-ups." }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid top-up request" }, { status: 400 });
  }
  if (!isAllowedTopupAmount(parsed.data.amountCents)) {
    return NextResponse.json({ error: "Unsupported top-up amount" }, { status: 400 });
  }

  const user = await upsertUser(email);
  const stripe = stripeServer();
  const baseUrl = appBaseUrl(req);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    client_reference_id: user.id,
    success_url: `${baseUrl}/settings?topup=success`,
    cancel_url: `${baseUrl}/settings?topup=cancel`,
    metadata: {
      userId: user.id,
      creditCents: String(parsed.data.amountCents),
      email,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: parsed.data.amountCents,
          product_data: {
            name: `Neural Mob credit top-up (${(parsed.data.amountCents / 100).toFixed(2)} USD)`,
          },
        },
      },
    ],
  });

  return NextResponse.json({ url: session.url });
}
