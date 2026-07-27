import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";

const updateNote = z.object({ title: z.string().trim().min(1).max(200).optional(), content: z.string().max(100_000).optional(), isPinned: z.boolean().optional() });

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const workspace = await getRequestWorkspace();
    if (!await db.note.findFirst({ where: { id, workspaceId: workspace.id } })) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    return NextResponse.json({ note: await db.note.update({ where: { id }, data: updateNote.parse(await request.json()) }) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const workspace = await getRequestWorkspace();
    const result = await db.note.deleteMany({ where: { id, workspaceId: workspace.id } });
    return result.count ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Note not found." }, { status: 404 });
  } catch (error) { return apiError(error); }
}
