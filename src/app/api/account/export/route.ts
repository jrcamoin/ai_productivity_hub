import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";
import { apiError } from "@/lib/api";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Sign in to export account data." }, { status: 401 });
    const workspace = await getRequestWorkspace();
    const data = await db.workspace.findUniqueOrThrow({
      where: { id: workspace.id },
      include: {
        notes: true,
        tasks: true,
        files: { include: { chunks: true } },
        meetings: true,
        conversations: { include: { messages: true } },
        subscription: true
      }
    });
    return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), user: session.user, workspace: data }, null, 2), {
      headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="orbit-export.json"' }
    });
  } catch (error) { return apiError(error); }
}
