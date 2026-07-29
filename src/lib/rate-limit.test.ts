import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("enforces the configured in-memory limit", async () => {
    const key = `test-${crypto.randomUUID()}`;
    expect((await rateLimit(key, 2, 60_000)).allowed).toBe(true);
    expect((await rateLimit(key, 2, 60_000)).remaining).toBe(0);
    expect((await rateLimit(key, 2, 60_000)).allowed).toBe(false);
  });

  it("uses the distributed store when both Upstash settings exist", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify([{ result: 2 }, { result: 5000 }]), { status: 200 }));
    const result = await rateLimit("distributed", 5, 60_000);
    expect(result).toMatchObject({ allowed: true, remaining: 3 });
    expect(fetchMock).toHaveBeenCalledOnce();
    fetchMock.mockRestore();
  });
});
