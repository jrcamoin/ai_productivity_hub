export const PLAN_LIMITS = {
  free: { aiActionsPerDay: 20, maxFileBytes: 10 * 1024 * 1024, maxFiles: 25 },
  pro: { aiActionsPerDay: 500, maxFileBytes: 50 * 1024 * 1024, maxFiles: 1000 }
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export function planLimits(plan?: string | null) {
  return PLAN_LIMITS[plan === "pro" ? "pro" : "free"];
}
