import { describe, it, expect } from "vitest";
import { applyBandZoneShift, bandPhaseZoneTargets, bandStartMileage, bandStartCardioMinutes, bandTriHours, type ThreeZone } from "./time-budget";
import type { WeeklyHoursBand } from "@/lib/schemas";
import type { PhaseName, ZoneDistribution } from "./types";

const BANDS: WeeklyHoursBand[] = ["h0_5", "h5_10", "h10_20", "h20_30", "h30_40"];
const base: ZoneDistribution = { z1: 25, z2: 60, z3: 8, z4: 4, z5: 3 };

describe("time-budget mapping", () => {
  it("start mileage increases monotonically with the budget", () => {
    const vals = BANDS.map(bandStartMileage);
    for (let i = 1; i < vals.length; i++) expect(vals[i]!).toBeGreaterThan(vals[i - 1]!);
  });

  it("tri hours (base + peak) increase monotonically; peak > base", () => {
    const peaks = BANDS.map((b) => bandTriHours(b)[1]);
    for (let i = 1; i < peaks.length; i++) expect(peaks[i]!).toBeGreaterThan(peaks[i - 1]!);
    for (const b of BANDS) {
      const [baseH, peakH] = bandTriHours(b);
      expect(peakH).toBeGreaterThan(baseH);
    }
  });

  it("impact cap: high budgets carry more cardio than running mileage implies", () => {
    // low/mid budgets: cardio == mileage x 18 (behavior unchanged)
    expect(bandStartCardioMinutes("h5_10")).toBe(bandStartMileage("h5_10") * 18);
    // high budgets: cardio exceeds mileage x 18 → the surplus routes to low-impact cardio
    expect(bandStartCardioMinutes("h30_40")).toBeGreaterThan(bandStartMileage("h30_40") * 18);
  });

  it("zone shift always sums to exactly the input total (100)", () => {
    for (const b of BANDS) {
      const z = applyBandZoneShift(base, b);
      expect(z.z1 + z.z2 + z.z3 + z.z4 + z.z5).toBe(100);
    }
  });

  it("never produces a negative zone", () => {
    for (const b of BANDS) {
      const z = applyBandZoneShift(base, b);
      for (const v of [z.z1, z.z2, z.z3, z.z4, z.z5]) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it("moves the middle up at low volume, down at high volume, holds z5", () => {
    const mid = (z: ZoneDistribution) => z.z3 + z.z4;
    const baseMid = mid(base);
    expect(mid(applyBandZoneShift(base, "h0_5"))).toBeGreaterThan(baseMid);
    expect(mid(applyBandZoneShift(base, "h30_40"))).toBeLessThan(baseMid);
    expect(applyBandZoneShift(base, "h10_20")).toEqual(base); // neutral anchor
    for (const b of BANDS) expect(applyBandZoneShift(base, b).z5).toBe(base.z5);
  });
});

describe("bandPhaseZoneTargets (research 3-zone -> 5-zone)", () => {
  const table: Record<WeeklyHoursBand, ThreeZone> = {
    h0_5: { easy: 55, gray: 25, hard: 20 },
    h5_10: { easy: 70, gray: 15, hard: 15 },
    h10_20: { easy: 80, gray: 8, hard: 12 },
    h20_30: { easy: 85, gray: 4, hard: 11 },
    h30_40: { easy: 88, gray: 3, hard: 9 },
  };
  const PHASES: PhaseName[] = ["base", "build", "peak", "taper"];

  it("every phase x band distribution sums to exactly 100", () => {
    for (const band of BANDS)
      for (const phase of PHASES) {
        const z = bandPhaseZoneTargets(phase, band, table);
        expect(z.z1 + z.z2 + z.z3 + z.z4 + z.z5).toBe(100);
      }
  });

  it("scales true high-intensity (z5) well above the old flat targets, higher at lower budgets", () => {
    const z5at = (band: WeeklyHoursBand) => bandPhaseZoneTargets("build", band, table).z5;
    expect(z5at("h0_5")).toBeGreaterThan(10); // 5h: far above the old ~3-8% z5
    expect(z5at("h0_5")).toBeGreaterThan(z5at("h10_20")); // intensity substitutes for volume
    expect(z5at("h10_20")).toBeGreaterThanOrEqual(z5at("h30_40"));
  });

  it("periodizes: peak carries more hard work than base at the same budget", () => {
    const base = bandPhaseZoneTargets("base", "h5_10", table).z5;
    const peak = bandPhaseZoneTargets("peak", "h5_10", table).z5;
    expect(peak).toBeGreaterThan(base);
  });
});
