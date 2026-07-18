import { describe, it, expect } from "vitest";
import { detectDecay, counterfactualLift, allocateTraffic } from "./forecaster.js";

describe("detectDecay (Metric Signal)", () => {
  it("fires when forecast falls below baseline past the threshold", () => {
    const history = [0.1, 0.1, 0.1];
    const forecast = [0.07, 0.06, 0.05];
    const sig = detectDecay(history, forecast, { threshold: 0.15 });
    expect(sig.decaying).toBe(true);
    expect(sig.delta).toBeLessThan(0);
  });

  it("stays quiet when the forecast holds", () => {
    const sig = detectDecay([0.1, 0.1, 0.1], [0.1, 0.1, 0.1]);
    expect(sig.decaying).toBe(false);
  });
});

describe("counterfactualLift", () => {
  it("measures actual vs predicted-no-change baseline", () => {
    expect(counterfactualLift(0.12, 0.1)).toBeCloseTo(0.2);
  });
});

describe("allocateTraffic (forecast-accelerated bandit)", () => {
  it("favours the predicted winner but keeps every arm exploring", () => {
    const alloc = allocateTraffic([1, 3], 0.1);
    expect(alloc[1]).toBeGreaterThan(alloc[0]!); // winner gets more
    expect(alloc[0]).toBeGreaterThan(0); // loser still explored
    expect(alloc.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
});
