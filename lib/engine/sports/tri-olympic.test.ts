import { describe, it, expect } from "vitest";
import { getSport, tri_olympic } from "./index";
import { buildSkeleton } from "../skeleton";
import type { EngineInput } from "../types";

describe("tri_olympic sport", () => {
  it("is registered and resolvable", () => {
    expect(getSport("tri_olympic")).toBe(tri_olympic);
    expect(tri_olympic.family).toBe("triathlon");
    expect(tri_olympic.programType).toBe("race_peaking");
  });

  it("carries per-discipline volume keyed by olympic:level (below 70.3)", () => {
    expect(tri_olympic.volume.kind).toBe("per_discipline");
    if (tri_olympic.volume.kind === "per_discipline") {
      const hpw = tri_olympic.volume.hoursPerWeekByLevel;
      expect(hpw["olympic:beginner"]).toBeDefined();
      expect(hpw["olympic:intermediate"]).toBeDefined();
      expect(hpw["olympic:advanced"]).toBeDefined();
      // Olympic sits below 70.3 volume.
      expect(hpw["olympic:advanced"]![1]).toBeLessThan(16);
    }
  });

  it("builds a valid deterministic skeleton (zones sum to 100)", () => {
    const input: EngineInput = {
      sport: "tri_olympic",
      trainingClass: "non_highly_trained",
      runningExp: "intermediate",
      hybridExp: "intermediate",
      liftingExp: "intermediate",
      swimLevel: "intermediate",
      bikeLevel: "intermediate",
      programType: "goal_event",
      durationWeeks: 12,
      trainingDays: ["mon", "tue", "wed", "thu", "fri", "sat"],
      races: [{ weekNumber: 12, priority: "A" }],
    };
    const sk = buildSkeleton(input);
    expect(sk.weeks).toHaveLength(12);
    for (const w of sk.weeks) {
      const z = w.zoneTargets;
      expect(z.z1 + z.z2 + z.z3 + z.z4 + z.z5).toBe(100);
    }
  });
});
