type Entry = { count: number; resetAt: number };
const globalStore = globalThis as unknown as { orbitRateLimits?: Map<string, Entry> };
const store = globalStore.orbitRateLimits ?? new Map<string, Entry>();
if (process.env.NODE_ENV !== "production") globalStore.orbitRateLimits = store;

export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number };

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }
  current.count += 1;
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}

async function redisRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const redisKey = `orbit:rate-limit:${key}`;
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["PTTL", redisKey]
    ]),
    signal: AbortSignal.timeout(3_000)
  });
  if (!response.ok) throw new Error(`Rate-limit store returned ${response.status}.`);
  const results = await response.json() as Array<{ result: number }>;
  const count = Number(results[0]?.result);
  let ttl = Number(results[1]?.result);
  if (count === 1 || ttl < 0) {
    const expire = await fetch(`${url}/pexpire/${encodeURIComponent(redisKey)}/${windowMs}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3_000)
    });
    if (!expire.ok) throw new Error(`Rate-limit expiry returned ${expire.status}.`);
    ttl = windowMs;
  }
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: Date.now() + ttl
  };
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return redisRateLimit(key, limit, windowMs);
  }
  return memoryRateLimit(key, limit, windowMs);
}
