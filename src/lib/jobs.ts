type JobName = "google.sync" | "document.process" | "meeting.summarize";

export type JobRequest = {
  id: string;
  name: JobName;
  payload: Record<string, unknown>;
  createdAt: string;
};

export async function enqueueJob(name: JobName, payload: Record<string, unknown>, id = crypto.randomUUID()) {
  if (!process.env.BACKGROUND_JOBS_URL) return { queued: false as const };
  if (!process.env.BACKGROUND_JOBS_SECRET) throw new Error("BACKGROUND_JOBS_SECRET is required when background jobs are enabled.");
  const job: JobRequest = { id, name, payload, createdAt: new Date().toISOString() };
  let lastStatus: number | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(process.env.BACKGROUND_JOBS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.BACKGROUND_JOBS_SECRET}`,
          "Idempotency-Key": id
        },
        body: JSON.stringify(job),
        signal: AbortSignal.timeout(8_000)
      });
      if (response.ok) return { queued: true as const, id };
      lastStatus = response.status;
      if (response.status < 500 && response.status !== 429) break;
    } catch {
      // Retry transient network and timeout failures.
    }
  }
  throw new Error(`Background job provider rejected job${lastStatus ? ` with ${lastStatus}` : ""}.`);
}
