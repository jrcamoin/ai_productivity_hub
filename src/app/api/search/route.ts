import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim();
    if (!q) return NextResponse.json({ results: [] });
    const workspace = await getRequestWorkspace();
    const [notes, tasks, meetings, chunks] = await Promise.all([
      db.note.findMany({ where: { workspaceId: workspace.id, OR: [{ title: { contains: q } }, { content: { contains: q } }] }, take: 10 }),
      db.task.findMany({ where: { workspaceId: workspace.id, OR: [{ title: { contains: q } }, { description: { contains: q } }] }, take: 10 }),
      db.meeting.findMany({ where: { workspaceId: workspace.id, OR: [{ title: { contains: q } }, { summary: { contains: q } }, { transcript: { contains: q } }] }, take: 10 }),
      db.documentChunk.findMany({ where: { file: { workspaceId: workspace.id }, content: { contains: q } }, include: { file: true }, take: 10 })
    ]);
    const results = [
      ...notes.map((item) => ({ type: "note", id: item.id, title: item.title, excerpt: item.content.slice(0, 180) })),
      ...tasks.map((item) => ({ type: "task", id: item.id, title: item.title, excerpt: item.description ?? item.status })),
      ...meetings.map((item) => ({ type: "meeting", id: item.id, title: item.title, excerpt: item.summary ?? item.transcript?.slice(0, 180) })),
      ...chunks.map((item) => ({ type: "document", id: item.fileId, title: item.file.name, excerpt: item.content.slice(0, 180), citation: `${item.file.name} · section ${item.chunkNo + 1}` }))
    ];
    return NextResponse.json({ results });
  } catch (error) { return apiError(error); }
}
