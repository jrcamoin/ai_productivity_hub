import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    services: {
      database: Boolean(process.env.DATABASE_URL),
      ai: Boolean(process.env.OPENAI_API_KEY),
      google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
      billing: Boolean(process.env.STRIPE_SECRET_KEY)
    }
  });
}
