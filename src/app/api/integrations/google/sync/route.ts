import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getRequestWorkspace } from "@/lib/workspace";
import { googleClient } from "@/lib/google";
import { google } from "googleapis";

export async function POST() {
  try {
    const workspace = await getRequestWorkspace();
    let integration = await db.integration.findUnique({ where: { workspaceId_provider: { workspaceId: workspace.id, provider: "google" } } });
    if (!integration) {
      const account = await db.account.findFirst({ where: { provider: "google" } });
      if (!account) return NextResponse.json({ error: "Connect Google before syncing." }, { status: 409 });
      integration = await db.integration.create({
        data: { workspaceId: workspace.id, provider: "google", accessToken: account.access_token, refreshToken: account.refresh_token }
      });
    }
    const auth = googleClient(integration.accessToken, integration.refreshToken);
    const [messages, events] = await Promise.all([
      google.gmail({ version: "v1", auth }).users.messages.list({ userId: "me", maxResults: 20, q: "newer_than:7d" }),
      google.calendar({ version: "v3", auth }).events.list({ calendarId: "primary", timeMin: new Date().toISOString(), maxResults: 20, singleEvents: true, orderBy: "startTime" })
    ]);
    await db.integration.update({
      where: { id: integration.id },
      data: { metadata: { gmailMessages: messages.data.messages?.length ?? 0, upcomingEvents: events.data.items?.length ?? 0, lastSyncAt: new Date().toISOString() } }
    });
    return NextResponse.json({ gmailMessages: messages.data.messages?.length ?? 0, upcomingEvents: events.data.items?.length ?? 0 });
  } catch (error) { return apiError(error, "Google sync failed."); }
}
