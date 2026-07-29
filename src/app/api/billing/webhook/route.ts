import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Webhook secret is not configured." }, { status: 409 });
    const signature = request.headers.get("stripe-signature");
    if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
    const stripe = stripeClient();
    const event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET);
    const existing = await db.webhookEvent.findUnique({ where: { id: event.id } });
    if (existing?.processedAt) return NextResponse.json({ received: true, duplicate: true });
    await db.webhookEvent.upsert({
      where: { id: event.id },
      update: {},
      create: { id: event.id, provider: "stripe", eventType: event.type }
    });
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const item = event.data.object;
      const workspaceId = item.metadata.workspaceId;
      if (workspaceId) await db.subscription.update({
        where: { workspaceId },
        data: {
          stripeCustomerId: String(item.customer),
          stripeSubscriptionId: item.id,
          plan: item.status === "active" || item.status === "trialing" ? "pro" : "free",
          status: item.status,
          currentPeriodEnd: new Date(item.items.data[0].current_period_end * 1000)
        }
      });
    }
    if (event.type === "customer.subscription.deleted") {
      const item = event.data.object;
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: item.id },
        data: { plan: "free", status: item.status, currentPeriodEnd: null }
      });
    }
    await db.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    return NextResponse.json({ received: true });
  } catch (error) { return apiError(error, "Invalid webhook."); }
}
