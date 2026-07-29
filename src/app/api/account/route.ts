import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";
import { storage } from "@/lib/storage";
import { stripeClient } from "@/lib/stripe";

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Sign in to delete your account." }, { status: 401 });
    const memberships = await db.membership.findMany({
      where: { userId: session.user.id },
      include: {
        workspace: {
          include: {
            memberships: true,
            files: { select: { storageKey: true } },
            subscription: true
          }
        }
      }
    });
    const exclusivelyOwned = memberships.filter(({ role, workspace }) => role === "owner" && workspace.memberships.length === 1);
    const sharedOwned = memberships.filter(({ role, workspace }) => role === "owner" && workspace.memberships.length > 1);
    if (sharedOwned.length) {
      return NextResponse.json({
        error: "Transfer ownership of shared workspaces before deleting your account.",
        workspaces: sharedOwned.map(({ workspace }) => ({ id: workspace.id, name: workspace.name }))
      }, { status: 409 });
    }
    for (const { workspace } of exclusivelyOwned) {
      if (workspace.subscription?.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
        await stripeClient().subscriptions.cancel(workspace.subscription.stripeSubscriptionId);
      }
      await Promise.all(workspace.files.map(({ storageKey }) => storage().remove(storageKey)));
      await db.workspace.delete({ where: { id: workspace.id } });
    }
    await db.user.delete({ where: { id: session.user.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
