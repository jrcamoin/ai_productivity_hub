import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";
import { stripeClient } from "@/lib/stripe";

export async function POST() {
  try {
    if (!process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO) return NextResponse.json({ error: "The Pro price is not configured." }, { status: 409 });
    const stripe = stripeClient();
    const workspace = await getRequestWorkspace();
    const subscription = await db.subscription.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO, quantity: 1 }],
      customer: subscription.stripeCustomerId ?? undefined,
      client_reference_id: workspace.id,
      subscription_data: { metadata: { workspaceId: workspace.id } },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?billing=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?billing=cancelled`
    });
    return NextResponse.json({ url: session.url });
  } catch (error) { return apiError(error); }
}
