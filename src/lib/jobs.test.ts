import { afterEach, describe, expect, it, vi } from "vitest";
import { enqueueJob } from "./jobs";

describe("enqueueJob", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("falls back to inline processing when no provider is configured", async () => {
    vi.stubEnv("BACKGROUND_JOBS_URL", "");
    await expect(enqueueJob("document.process", { assetId: "asset" })).resolves.toEqual({ queued: false });
  });

  it("sends an idempotent authenticated job envelope", async () => {
    vi.stubEnv("BACKGROUND_JOBS_URL", "https://jobs.example/enqueue");
    vi.stubEnv("BACKGROUND_JOBS_SECRET", "secret");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 202 }));
    const result = await enqueueJob("document.process", { assetId: "asset" }, "job-1");
    expect(result).toEqual({ queued: true, id: "job-1" });
    expect(fetchMock).toHaveBeenCalledWith("https://jobs.example/enqueue", expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer secret", "Idempotency-Key": "job-1" })
    }));
  });

  it("requires a secret for a configured provider", async () => {
    vi.stubEnv("BACKGROUND_JOBS_URL", "https://jobs.example/enqueue");
    vi.stubEnv("BACKGROUND_JOBS_SECRET", "");
    await expect(enqueueJob("document.process", {})).rejects.toThrow("BACKGROUND_JOBS_SECRET");
  });
});
