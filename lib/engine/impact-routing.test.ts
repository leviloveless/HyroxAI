import { describe, it, expect } from "vitest";
import { runImpactFactor, bandStartMileage } from "./time-budget";
import { buildSkeleton } from "./skeleton";
import type { EngineInput } from "./types";

/**
 * Batch 7: a beginner and/or heavier athlete runs a smaller share of the band's
 * aerobic budget (the reconciler routes the rest to low-impact cardio), WITHOUT
 * changing total cardio minutes. Intermediate + no bodyweight is the identity,
 * so existing snapshots stay byte-identical.
 */
describe("runImpactFactor", () => {
  it("is identity for an intermediate runner with no bodyweight", () => {
    expect(runImpactFactor("intermediate")).toBe(1);
    expect(runImpactFactor("advanced")).toBe(1);
  });
  it("scales a beginner down to 60% of band mileage", () => {
    expect(runImpactFactor("beginner")).toBeCloseTo(0.6, 5);
  });
  it("tapers the running share for heavier athletes, floored at 0.8", () => {
    expect(runImpactFactor("intermediate", 185)).toBe(1);
    expect(runImpactFactor("intermediate", 250)).toBeCloseTo(0.805, 3);
    expect(runImpactFactor("intermediate", 500)).toBe(0.8); // floor
  });
  it("compounds experience and bodyweight", () => {
    expect(runImpactFactor("beginner", 250)).toBeCloseTo(0.6 * 0.805, 3);
  });
});

function hyrox(exp: EngineInput["runningExp"], bodyWeightLbs?: number): EngineInput {
  return {
    sport: "hyrox",
    weeklyHours: "h10_20",
    trainingClass: "highly_trained",
    runningExp: exp,
    hybridExp: "intermediate",
    liftingExp: "advanced",
    programType: "goal_event",
    durationWeeks: 17,
    trainingDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    races: [{ weekNumber: 17, priority: "A" }],
    ...(bodyWeightLbs != null ? { bodyWeightLbs } : {}),
  };
}

describe("skeleton start volume", () => {
  it("a beginner heavy athlete starts at lower running mileage than an intermediate", () => {
    const beg = buildSkeleton(hyrox("beginner", 250));
    const int = buildSkeleton(hyrox("intermediate"));
    expect(beg.weeks[0]!.targetMileage).toBeLessThan(int.weeks[0]!.targetMileage);
    // total cardio budget is unchanged by the impact routing
    expect(beg.weeks[0]!.targetCardioMinutes).toBe(int.weeks[0]!.targetCardioMinutes);
  });
  it("intermediate with no bodyweight is unchanged from the raw band mileage", () => {
    const int = buildSkeleton(hyrox("intermediate"));
    expect(int.weeks[0]!.targetMileage).toBe(bandStartMileage("h10_20"));
  });
  it("an explicit startMileage override still wins over the auto-scale", () => {
    const forced = buildSkeleton({ ...hyrox("beginner", 250), startMileage: 12 });
    expect(forced.weeks[0]!.targetMileage).toBe(12);
  });
});
