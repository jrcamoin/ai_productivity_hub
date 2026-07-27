import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";

const createTask = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueAt: z.string().datetime().optional()
});

export async function GET() {
  try {
    const workspace = await getRequestWorkspace();
    const tasks = await db.task.findMany({ where: { workspaceId: workspace.id }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] });
    return NextResponse.json({ tasks });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const input = createTask.parse(await request.json());
    const workspace = await getRequestWorkspace();
    const task = await db.task.create({
      data: { ...input, dueAt: input.dueAt ? new Date(input.dueAt) : undefined, workspaceId: workspace.id }
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) { return apiError(error); }
}
