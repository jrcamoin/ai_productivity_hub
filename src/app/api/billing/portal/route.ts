import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";
import { stripeClient } from "@/lib/stripe";

export async function POST() {
  try {
    const workspace = await getRequestWorkspace();
    const subscription = await db.subscription.findUniqueOrThrow({ where: { workspaceId: workspace.id } });
    if (!subscription.stripeCustomerId) return NextResponse.json({ error: "No Stripe customer exists for this workspace." }, { status: 409 });
    const session = await stripeClient().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: process.env.NEXT_PUBLIC_APP_URL
    });
    return NextResponse.json({ url: session.url });
  } catch (error) { return apiError(error); }
}
