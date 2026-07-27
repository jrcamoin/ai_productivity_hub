import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";

const noteInput = z.object({ title: z.string().trim().min(1).max(200), content: z.string().max(100_000), isPinned: z.boolean().default(false) });

export async function GET() {
  try {
    const workspace = await getRequestWorkspace();
    return NextResponse.json({ notes: await db.note.findMany({ where: { workspaceId: workspace.id }, orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }] }) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const workspace = await getRequestWorkspace();
    const note = await db.note.create({ data: { ...noteInput.parse(await request.json()), workspaceId: workspace.id } });
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) { return apiError(error); }
}
