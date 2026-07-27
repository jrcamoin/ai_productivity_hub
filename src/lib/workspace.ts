import { auth } from "@/auth";
import { db, getDemoWorkspace } from "@/lib/db";

export async function getRequestWorkspace() {
  const session = await auth();
  if (!session?.user?.id) return getDemoWorkspace();
  const membership = await db.membership.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true }
  });
  if (membership) return membership.workspace;
  const baseSlug = (session.user.name || session.user.email || "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return db.workspace.create({
    data: {
      name: session.user.name ? `${session.user.name}'s Workspace` : "My Workspace",
      slug: `${baseSlug || "workspace"}-${session.user.id.slice(-6)}`,
      memberships: { create: { userId: session.user.id, role: "owner" } },
      subscription: { create: { plan: "free", status: "active" } }
    }
  });
}
