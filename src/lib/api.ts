import { NextResponse } from "next/server";

export function apiError(error: unknown, fallback = "Something went wrong.") {
  console.error(error);
  return NextResponse.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 });
}
