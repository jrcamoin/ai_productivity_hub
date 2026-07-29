import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logError } from "@/lib/observability";

export function apiError(error: unknown, fallback = "Something went wrong.") {
  const requestId = crypto.randomUUID();
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "The request payload is invalid.", requestId }, { status: 400 });
  }
  const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 500;
  if (status >= 500) logError("api_request_failed", error, { requestId });
  const safeMessage = status < 500 && error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: safeMessage, requestId }, { status });
}
