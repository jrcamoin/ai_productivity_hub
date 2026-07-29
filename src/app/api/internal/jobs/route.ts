import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { processDocument } from "@/lib/document-processing";
import { meetingInput, processMeeting } from "@/lib/meeting-processing";
import { syncGoogle } from "@/lib/google-sync";

const jobSchema = z.object({
  id: z.string().min(1),
  name: z.enum(["google.sync", "document.process", "meeting.summarize"]),
  payload: z.record(z.unknown()),
  createdAt: z.string().datetime()
});

function authorized(request: NextRequest) {
  const configured = process.env.BACKGROUND_JOBS_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configured || !supplied) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(request: NextRequest) {
  try {
    if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const job = jobSchema.parse(await request.json());
    if (job.name === "document.process") {
      const payload = z.object({ assetId: z.string(), workspaceId: z.string() }).parse(job.payload);
      const result = await processDocument(payload.assetId, payload.workspaceId);
      return NextResponse.json({ processed: true, jobId: job.id, chunks: result.chunks });
    }
    if (job.name === "meeting.summarize") {
      const payload = z.object({ input: meetingInput, workspaceId: z.string() }).parse(job.payload);
      const result = await processMeeting(payload.input, payload.workspaceId);
      return NextResponse.json({ processed: true, jobId: job.id, meetingId: result.meeting.id, tasksCreated: result.tasksCreated });
    }
    if (job.name === "google.sync") {
      const payload = z.object({ workspaceId: z.string(), userId: z.string() }).parse(job.payload);
      const result = await syncGoogle(payload.workspaceId, payload.userId);
      return NextResponse.json({ processed: true, jobId: job.id, ...result });
    }
    return NextResponse.json({ error: "Unsupported job." }, { status: 422 });
  } catch (error) {
    return apiError(error, "Background job failed.");
  }
}
