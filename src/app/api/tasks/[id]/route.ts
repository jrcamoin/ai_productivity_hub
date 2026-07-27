import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";

const updateTask = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueAt: z.string().datetime().nullable().optional()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const input = updateTask.parse(await request.json());
    const workspace = await getRequestWorkspace();
    const existing = await db.task.findFirst({ where: { id, workspaceId: workspace.id } });
    if (!existing) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    const task = await db.task.update({
      where: { id },
      data: { ...input, dueAt: input.dueAt === null ? null : input.dueAt ? new Date(input.dueAt) : undefined }
    });
    return NextResponse.json({ task });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const workspace = await getRequestWorkspace();
    const result = await db.task.deleteMany({ where: { id, workspaceId: workspace.id } });
    return result.count ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Task not found." }, { status: 404 });
  } catch (error) { return apiError(error); }
}
