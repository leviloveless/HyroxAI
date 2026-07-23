import { describe, it, expect } from "vitest";
import { planWeek, RUN_COUNT, HYBRID_COUNT, type SessionCountTables } from "./slots";
import { bandSessionCap, bandAnchorRunFloor } from "./time-budget";

/**
 * Batch 4 (Finding 4): a band athlete's total weekly sessions are reconciled
 * against the hours budget so a 10 h athlete gets ~5–6 anchors, not 8–10
 * fragments. Trim comes off easy filler runs first, then surplus hybrids for
 * run-dominant sports; the research lift dose is never touched.
 */

// A HYROX-shaped table wired the way skeleton.ts wires it for a band athlete.
function bandTable(cap: number, floor: number, lift = 2): SessionCountTables {
  return {
    run: RUN_COUNT,
    hybrid: HYBRID_COUNT,
    lift: { base: lift, build: lift, peak: lift, taper: Math.max(1, lift - 1) },
    guaranteeQuality: true,
    researchLifts: true,
    runCharacter: "full",
    weeklySessionCap: cap,
    anchorRunFloor: floor,
  };
}

const total = (p: { runs: number; lifts: number; hybrids: number }) => p.runs + p.lifts + p.hybrids;

describe("session-count reconciliation", () => {
  it("caps a 10 h intermediate Build week from 10 sessions to the budget", () => {
    // Uncapped: 5 runs + 2 lifts + 2 hybrids = 9–10 fragments.
    const uncapped = planWeek("build", "increase", "intermediate", "intermediate", undefined, {
      run: RUN_COUNT,
      hybrid: HYBRID_COUNT,
      lift: { base: 2, build: 2, peak: 2, taper: 1 },
    });
    expect(total(uncapped)).toBeGreaterThanOrEqual(8);

    const capped = planWeek("build", "increase", "intermediate", "intermediate", undefined, bandTable(6, 3));
    expect(total(capped)).toBeLessThanOrEqual(6);
  });

  it("preserves the anchor run floor (long + threshold + VO2)", () => {
    const p = planWeek("build", "increase", "advanced", "advanced", undefined, bandTable(6, 3));
    expect(p.runs).toBeGreaterThanOrEqual(3); // never trims below the quality anchors
  });

  it("never trims the research lift dose", () => {
    const p = planWeek("build", "increase", "beginner", "beginner", undefined, bandTable(5, 2, 3));
    expect(p.lifts).toBe(3); // lifts are anchors, protected by the cap
  });

  it("at the lowest budget keeps only long + VO2 (floor 2)", () => {
    const p = planWeek("build", "increase", "beginner", "beginner", undefined, bandTable(5, 2, 1));
    expect(p.runs).toBeGreaterThanOrEqual(2);
  });

  it("does not touch un-capped (golden) tables", () => {
    const g = planWeek("build", "increase", "intermediate", "intermediate", undefined, {
      run: RUN_COUNT,
      hybrid: HYBRID_COUNT,
      lift: { base: 3, build: 3, peak: 3, taper: 2 },
    });
    expect(g.runs).toBe(RUN_COUNT.build[1]); // exactly the phase/exp count, no cap applied
  });

  it("band tables expose sane cap/floor values", () => {
    expect(bandSessionCap("h5_10")).toBe(6);
    expect(bandSessionCap("h30_40")).toBeGreaterThan(bandSessionCap("h0_5"));
    expect(bandAnchorRunFloor("h0_5")).toBe(2);
    expect(bandAnchorRunFloor("h10_20")).toBe(3);
  });
});
