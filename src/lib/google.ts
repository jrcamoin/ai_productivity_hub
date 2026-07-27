import { google } from "googleapis";

export function googleClient(accessToken?: string | null, refreshToken?: string | null) {
  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET) throw new Error("Google OAuth is not configured.");
  const client = new google.auth.OAuth2(process.env.AUTH_GOOGLE_ID, process.env.AUTH_GOOGLE_SECRET, `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`);
  client.setCredentials({ access_token: accessToken ?? undefined, refresh_token: refreshToken ?? undefined });
  return client;
}
