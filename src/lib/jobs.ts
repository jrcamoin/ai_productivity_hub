type JobName = "google.sync" | "document.process" | "meeting.summarize";

export async function enqueueJob(name: JobName, payload: Record<string, unknown>) {
  if (!process.env.BACKGROUND_JOBS_URL) return { queued: false as const };
  const response = await fetch(process.env.BACKGROUND_JOBS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.BACKGROUND_JOBS_SECRET ?? ""}`
    },
    body: JSON.stringify({ name, payload })
  });
  if (!response.ok) throw new Error(`Background job provider returned ${response.status}.`);
  return { queued: true as const };
}
