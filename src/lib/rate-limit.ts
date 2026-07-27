type Entry = { count: number; resetAt: number };
const globalStore = globalThis as unknown as { orbitRateLimits?: Map<string, Entry> };
const store = globalStore.orbitRateLimits ?? new Map<string, Entry>();
if (process.env.NODE_ENV !== "production") globalStore.orbitRateLimits = store;

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  current.count += 1;
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count) };
}
