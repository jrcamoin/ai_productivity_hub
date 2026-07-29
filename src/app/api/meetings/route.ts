import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";
import { planLimits } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import { enqueueJob } from "@/lib/jobs";
import { meetingInput, processMeeting } from "@/lib/meeting-processing";

export async function GET() {
  try {
    const workspace = await getRequestWorkspace();
    return NextResponse.json({ meetings: await db.meeting.findMany({ where: { workspaceId: workspace.id }, orderBy: { occurredAt: "desc" } }) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const input = meetingInput.parse(await request.json());
    const workspace = await getRequestWorkspace();
    const subscription = await db.subscription.findUnique({ where: { workspaceId: workspace.id } });
    const limit = await rateLimit(`ai:${workspace.id}`, planLimits(subscription?.plan).aiActionsPerDay, 24 * 60 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: "Your daily AI action limit has been reached." }, { status: 429 });
    const queued = await enqueueJob("meeting.summarize", { input, workspaceId: workspace.id });
    if (queued.queued) return NextResponse.json({ queued: true, jobId: queued.id }, { status: 202 });
    return NextResponse.json(await processMeeting(input, workspace.id), { status: 201 });
  } catch (error) { return apiError(error); }
}
