import { google } from "googleapis";
import { db } from "@/lib/db";
import { googleClient } from "@/lib/google";

export async function syncGoogle(workspaceId: string, userId: string) {
  const membership = await db.membership.findFirst({ where: { workspaceId, userId } });
  if (!membership) throw new Error("Google sync job does not belong to this user.");
  let integration = await db.integration.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: "google" } }
  });
  if (!integration) {
    const account = await db.account.findFirst({ where: { provider: "google", userId } });
    if (!account) throw new GoogleConnectionError("Connect Google before syncing.");
    integration = await db.integration.create({
      data: { workspaceId, provider: "google", accessToken: account.access_token, refreshToken: account.refresh_token }
    });
  }
  const auth = googleClient(integration.accessToken, integration.refreshToken);
  const [messages, events] = await Promise.all([
    google.gmail({ version: "v1", auth }).users.messages.list({ userId: "me", maxResults: 20, q: "newer_than:7d" }),
    google.calendar({ version: "v3", auth }).events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime"
    })
  ]);
  const result = {
    gmailMessages: messages.data.messages?.length ?? 0,
    upcomingEvents: events.data.items?.length ?? 0
  };
  await db.integration.update({
    where: { id: integration.id },
    data: { metadata: { ...result, lastSyncAt: new Date().toISOString() } }
  });
  return result;
}

class GoogleConnectionError extends Error {
  status = 409;
}
