import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api";

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Sign in to delete your account." }, { status: 401 });
    await db.user.delete({ where: { id: session.user.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
