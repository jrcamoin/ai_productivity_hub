import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";

const meetingInput = z.object({
  title: z.string().trim().min(1).max(200),
  transcript: z.string().trim().min(20).max(500_000),
  occurredAt: z.string().datetime().optional(),
  createTasks: z.boolean().default(true)
});

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
    let summary = input.transcript.slice(0, 500);
    let actions: string[] = [];
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.responses.create({
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-sol",
        instructions: "Summarize this meeting concisely. End with a section titled Action items and use one dash per concrete action.",
        input: input.transcript
      });
      summary = response.output_text;
      const section = summary.split(/Action items:?/i)[1] ?? "";
      actions = section.split("\n").map((line) => line.replace(/^[-*]\s*/, "").trim()).filter(Boolean).slice(0, 10);
    }
    const meeting = await db.meeting.create({
      data: { title: input.title, transcript: input.transcript, summary, actionItems: actions, occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(), workspaceId: workspace.id }
    });
    if (input.createTasks && actions.length) await db.task.createMany({ data: actions.map((title) => ({ title, priority: "medium", workspaceId: workspace.id })) });
    return NextResponse.json({ meeting, tasksCreated: input.createTasks ? actions.length : 0 }, { status: 201 });
  } catch (error) { return apiError(error); }
}
