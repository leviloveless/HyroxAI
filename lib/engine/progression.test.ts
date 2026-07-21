import { describe, it, expect } from "vitest";
import {
  saturation,
  parseClock,
  formatClock,
  projectEvent,
  projectTimes,
  type ProjectionContext,
} from "./progression";
import { eventBand } from "./hyrox-standards";

const CTX: ProjectionContext = {
  runningExp: "intermediate",
  hybridExp: "intermediate",
  weeks: 12,
  sex: "male",
  division: "open",
  age: 30,
};

describe("saturation", () => {
  it("matches the calibration table (τ=11), front-loaded", () => {
    expect(saturation(12)).toBeCloseTo(0.664, 2);
    expect(saturation(24)).toBeCloseTo(0.887, 2);
    expect(saturation(0)).toBe(0);
    expect(saturation(-5)).toBe(0);
    // marginal week adds less as weeks grow
    expect(saturation(8) - saturation(4)).toBeGreaterThan(saturation(24) - saturation(20));
  });
});

describe("parse/format clock", () => {
  it("round-trips mm:ss and h:mm:ss", () => {
    expect(parseClock("6:40")).toBe(400);
    expect(parseClock("1:25:44")).toBe(5144);
    expect(parseClock("nope")).toBeNull();
    expect(parseClock(undefined)).toBeNull();
    expect(formatClock(400)).toBe("6:40");
    expect(formatClock(5144)).toBe("1:25:44");
  });
});

describe("projectEvent", () => {
  it("faster current time improves LESS (diminishing returns)", () => {
    const fast = projectEvent("hyroxRunTotal", 1800, CTX); // near elite floor
    const slow = projectEvent("hyroxRunTotal", 2200, CTX); // more headroom
    expect(slow.improvementPct).toBeGreaterThan(fast.improvementPct);
  });

  it("less experienced athletes improve more", () => {
    const beg = projectEvent("hyroxRunTotal", 2100, { ...CTX, runningExp: "beginner" });
    const int = projectEvent("hyroxRunTotal", 2100, { ...CTX, runningExp: "intermediate" });
    const adv = projectEvent("hyroxRunTotal", 2100, { ...CTX, runningExp: "advanced" });
    expect(beg.improvementPct).toBeGreaterThan(int.improvementPct);
    expect(int.improvementPct).toBeGreaterThan(adv.improvementPct);
  });

  it("longer programs project more improvement", () => {
    const short = projectEvent("hyroxRow", 300, { ...CTX, weeks: 4 });
    const long = projectEvent("hyroxRow", 300, { ...CTX, weeks: 20 });
    expect(long.improvementPct).toBeGreaterThan(short.improvementPct);
  });

  it("runs move more than the sled (trainability)", () => {
    const run = projectEvent("hyroxRunTotal", 2100, CTX).improvementPct;
    const sled = projectEvent("hyroxSledPush", 200, CTX).improvementPct;
    expect(run).toBeGreaterThan(sled);
  });

  it("never projects slower, and never past the elite floor", () => {
    const band = eventBand("hyroxWallBalls", "male", "open", 30);
    const p = projectEvent("hyroxWallBalls", 900, { ...CTX, hybridExp: "beginner", weeks: 24 });
    expect(p.projectedSec).toBeLessThanOrEqual(900);
    expect(p.projectedSec).toBeGreaterThanOrEqual(band.F * 0.98);
  });

  it("intermediate 12-wk run projection is a sane single-digit %", () => {
    const p = projectEvent("hyroxRunTotal", 2000, CTX);
    expect(p.improvementPct).toBeGreaterThan(0.5);
    expect(p.improvementPct).toBeLessThan(6);
  });
});

const SINGLES = {
  hyroxRunTotal: "45:00",
  hyroxSkiErg: "4:30",
  hyroxSledPush: "3:00",
  hyroxSledPull: "5:00",
  hyroxBurpeeBroadJump: "5:30",
  hyroxRow: "4:40",
  hyroxFarmersCarry: "2:10",
  hyroxSandbagLunge: "5:00",
  hyroxWallBalls: "7:00",
  hyroxRoxzone: "7:30",
};

describe("projectTimes", () => {
  it("singles with the full set projects a faster finish = sum of events", () => {
    const r = projectTimes(SINGLES, CTX, "singles");
    expect(r.perEvent).toHaveLength(10);
    expect(r.finishProjectedSec!).toBeLessThan(r.finishCurrentSec!);
    const sum = r.perEvent.reduce((s, e) => s + e.projectedSec, 0);
    expect(r.finishProjectedSec).toBeCloseTo(sum, 5);
    expect(r.note).toBeUndefined();
  });

  it("doubles projects running only, no finish, with a caveat note", () => {
    const r = projectTimes(SINGLES, CTX, "doubles");
    expect(r.perEvent.map((e) => e.key)).toEqual(["hyroxRunTotal"]);
    expect(r.finishProjectedSec).toBeNull();
    expect(r.note).toMatch(/shared/i);
  });

  it("partial singles entry shows events but no finish", () => {
    const r = projectTimes({ hyroxRunTotal: "45:00", hyroxRow: "4:40" }, CTX, "singles");
    expect(r.perEvent).toHaveLength(2);
    expect(r.finishProjectedSec).toBeNull();
    expect(r.note).toMatch(/full finish/i);
  });

  it("empty benchmarks → guidance note, no crash", () => {
    const r = projectTimes({}, CTX, "singles");
    expect(r.perEvent).toHaveLength(0);
    expect(r.note).toMatch(/look up/i);
  });
});
