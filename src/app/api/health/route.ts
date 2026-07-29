import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  let database = false;
  try {
    await db.$queryRaw`SELECT 1`;
    database = true;
  } catch {
    database = false;
  }
  const productionReady = database
    && Boolean(process.env.AUTH_SECRET)
    && Boolean(process.env.NEXT_PUBLIC_APP_URL)
    && (process.env.NODE_ENV !== "production" || Boolean(process.env.S3_BUCKET));
  return NextResponse.json({
    status: productionReady ? "ok" : "degraded",
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "development",
    version: process.env.APP_VERSION ?? "unknown",
    services: {
      database,
      objectStorage: process.env.S3_BUCKET ? "s3" : "local",
      ai: Boolean(process.env.OPENAI_API_KEY),
      google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
      billing: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      jobs: Boolean(process.env.BACKGROUND_JOBS_URL && process.env.BACKGROUND_JOBS_SECRET),
      distributedRateLimits: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    }
  }, { status: productionReady ? 200 : 503 });
}
