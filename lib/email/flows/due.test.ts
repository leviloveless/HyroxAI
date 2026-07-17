import { describe, it, expect } from "vitest";
import { trialStageDue } from "./due";

// Trial starts 2026-07-03 → 14-day trial ends 2026-07-17 (end date, regardless of time).
const START = "2026-07-03T09:00:00.000Z";
const at = (day: number, hour = 14) => Date.UTC(2026, 6, day, hour); // July = month 6

describe("trialStageDue — 14-day trial ending 2026-07-17", () => {
  it("T-3 fires 3 days before the end date", () => {
    expect(trialStageDue(START, at(14))).toBe("T-3");
  });
  it("T-1 fires 1 day before the end date", () => {
    expect(trialStageDue(START, at(16))).toBe("T-1");
  });
  it("T-0 fires on the end date", () => {
    expect(trialStageDue(START, at(17))).toBe("T-0");
  });

  it("does not fire on off-days (T-2, T-4)", () => {
    expect(trialStageDue(START, at(15))).toBeNull(); // 2 days out
    expect(trialStageDue(START, at(13))).toBeNull(); // 4 days out
  });

  it("never fires the day after the trial ended", () => {
    expect(trialStageDue(START, at(18))).toBeNull();
  });

  it("never re-fires a long-expired trial", () => {
    expect(trialStageDue(START, Date.UTC(2026, 7, 20))).toBeNull(); // ~a month later
  });

  it("does not fire early in the trial", () => {
    expect(trialStageDue(START, at(4))).toBeNull(); // day 1
  });
});

describe("trialStageDue — time-of-day independence", () => {
  it("uses the UTC calendar date, not raw hours (late-night start)", () => {
    const lateStart = "2026-07-03T23:30:00.000Z"; // still ends on the 17th (date)
    expect(trialStageDue(lateStart, at(14, 0))).toBe("T-3"); // cron at 00:00
    expect(trialStageDue(lateStart, at(14, 23))).toBe("T-3"); // cron at 23:00 same day
  });
  it("early-morning start also maps by date", () => {
    const earlyStart = "2026-07-03T00:15:00.000Z";
    expect(trialStageDue(earlyStart, at(17, 12))).toBe("T-0");
  });
});

describe("trialStageDue — edge cases", () => {
  it("returns null on an unparseable start", () => {
    expect(trialStageDue("not-a-date", at(17))).toBeNull();
  });
  it("honors a custom trial length", () => {
    // 7-day trial starting 2026-07-03 ends 2026-07-10.
    expect(trialStageDue(START, Date.UTC(2026, 6, 7), 7)).toBe("T-3");
    expect(trialStageDue(START, Date.UTC(2026, 6, 10), 7)).toBe("T-0");
  });
});
