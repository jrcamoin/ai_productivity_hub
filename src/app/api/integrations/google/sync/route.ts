import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { getRequestWorkspace } from "@/lib/workspace";
import { auth as getSession } from "@/auth";
import { enqueueJob } from "@/lib/jobs";
import { syncGoogle } from "@/lib/google-sync";

export async function POST() {
  try {
    const workspace = await getRequestWorkspace();
    const session = await getSession();
    if (!session?.user?.id) return NextResponse.json({ error: "Sign in to sync Google." }, { status: 401 });
    const queued = await enqueueJob("google.sync", { workspaceId: workspace.id, userId: session.user.id });
    if (queued.queued) return NextResponse.json({ queued: true, jobId: queued.id }, { status: 202 });
    return NextResponse.json(await syncGoogle(workspace.id, session.user.id));
  } catch (error) { return apiError(error, "Google sync failed."); }
}
