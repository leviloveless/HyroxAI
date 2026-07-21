import { describe, it, expect } from "vitest";
import { applyBandZoneShift, bandStartMileage, bandTriHours } from "./time-budget";
import type { WeeklyHoursBand } from "@/lib/schemas";
import type { ZoneDistribution } from "./types";

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
