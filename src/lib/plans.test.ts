import { describe, expect, it } from "vitest";
import { planLimits } from "./plans";

describe("planLimits", () => {
  it("defaults unknown plans to free", () => {
    expect(planLimits("unknown")).toEqual(planLimits("free"));
  });
  it("gives Pro more AI actions and storage", () => {
    expect(planLimits("pro").aiActionsPerDay).toBeGreaterThan(planLimits("free").aiActionsPerDay);
    expect(planLimits("pro").maxFileBytes).toBeGreaterThan(planLimits("free").maxFileBytes);
  });
});
