import OpenAI from "openai";
import { z } from "zod";
import { db } from "@/lib/db";

export const meetingInput = z.object({
  title: z.string().trim().min(1).max(200),
  transcript: z.string().trim().min(20).max(500_000),
  occurredAt: z.string().datetime().optional(),
  createTasks: z.boolean().default(true)
});

export type MeetingInput = z.infer<typeof meetingInput>;

export async function processMeeting(input: MeetingInput, workspaceId: string) {
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
    data: {
      title: input.title,
      transcript: input.transcript,
      summary,
      actionItems: actions,
      occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      workspaceId
    }
  });
  if (input.createTasks && actions.length) {
    await db.task.createMany({ data: actions.map((title) => ({ title, priority: "medium", workspaceId })) });
  }
  return { meeting, tasksCreated: input.createTasks ? actions.length : 0 };
}
