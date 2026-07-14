import { describe, it, expect } from "vitest";
import {
  sessionLabel,
  flattenProgramSessions,
  encodeSessionValue,
  decodeSessionValue,
  programDayForDate,
  resolveActualDay,
} from "./link";
import type { ProgramData, Session } from "@/lib/schemas";

const run: Session = {
  kind: "run",
  runType: "easy",
  durationMin: 40,
  paceMinMile: "8:30",
  distanceMiles: 5,
  goalZone: 2,
};
const lift: Session = { kind: "lift", liftType: "lower", movements: [] };
const race: Session = { kind: "race", priority: "A" };
const hybridSim: Session = { kind: "hybrid", goalZone: 4, elements: [], simulation: true };
const cardio: Session = { kind: "cardio", durationMin: 30, goalZone: 1 };

describe("sessionLabel", () => {
  it("labels each kind", () => {
    expect(sessionLabel(run)).toBe("Easy run");
    expect(sessionLabel(lift)).toBe("Lower body lift");
    expect(sessionLabel(hybridSim)).toBe("Race Simulation");
    expect(sessionLabel({ kind: "hybrid", goalZone: 4, elements: [] })).toBe("Hybrid (HYROX)");
    expect(sessionLabel(cardio)).toBe("Zone 1–2 cardio");
    expect(sessionLabel(race)).toBe("A race");
  });
});

describe("flattenProgramSessions", () => {
  const program: ProgramData = {
    generatedAt: "2026-01-01",
    weeks: [
      {
        weekNumber: 1,
        phase: "base",
        microWeek: "increase",
        summary: { totalCardioMinutes: 0, totalMileage: 0, zoneDistribution: { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 } },
        days: [
          { day: "mon", sessions: [run, lift] },
          { day: "tue", sessions: [] },
          { day: "sat", sessions: [race, cardio] }, // race at index 0, cardio at index 1
        ],
      },
    ],
  };

  it("emits every non-race session with the true in-day index", () => {
    const flat = flattenProgramSessions(program);
    expect(flat).toEqual([
      { weekNumber: 1, day: "mon", sessionIndex: 0, label: "Easy run" },
      { weekNumber: 1, day: "mon", sessionIndex: 1, label: "Lower body lift" },
      // race (sat index 0) skipped; cardio keeps its true index 1
      { weekNumber: 1, day: "sat", sessionIndex: 1, label: "Zone 1–2 cardio" },
    ]);
  });

  it("skips rest days (empty sessions)", () => {
    const flat = flattenProgramSessions(program);
    expect(flat.some((s) => s.day === "tue")).toBe(false);
  });
});

describe("encode/decode session value", () => {
  it("round-trips", () => {
    const pos = { weekNumber: 3, day: "wed", sessionIndex: 2 };
    expect(decodeSessionValue(encodeSessionValue(pos))).toEqual(pos);
  });
  it("rejects malformed values", () => {
    expect(decodeSessionValue("bad")).toBeNull();
    expect(decodeSessionValue("1:xyz:0")).toBeNull();
    expect(decodeSessionValue("1:mon:x")).toBeNull();
  });
});

describe("programDayForDate", () => {
  // Program starts Wed Jul 1 2026 → week 1 Monday is Jun 29 2026.
  const start = "2026-07-01";
  const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

  it("maps the start date to its weekday in week 1", () => {
    // Jul 1 is a Wednesday.
    expect(programDayForDate(start, 8, at(2026, 7, 1))).toEqual({ weekNumber: 1, day: "wed" });
  });
  it("maps the week-1 Monday (before the start date) to week 1 Monday", () => {
    expect(programDayForDate(start, 8, at(2026, 6, 29))).toEqual({ weekNumber: 1, day: "mon" });
  });
  it("rolls into week 2 the following Monday", () => {
    expect(programDayForDate(start, 8, at(2026, 7, 6))).toEqual({ weekNumber: 2, day: "mon" });
  });
  it("maps a Sunday to the end of its week", () => {
    // Jul 5 2026 is a Sunday, still in week 1.
    expect(programDayForDate(start, 8, at(2026, 7, 5))).toEqual({ weekNumber: 1, day: "sun" });
  });
  it("returns null before the program's first week", () => {
    expect(programDayForDate(start, 8, at(2026, 6, 28))).toBeNull();
  });
  it("returns null past the final week", () => {
    // Week 8's Sunday is Aug 23 2026; Aug 24 starts week 9 → out of an 8-week program.
    expect(programDayForDate(start, 8, at(2026, 8, 24))).toBeNull();
  });
  it("ignores time-of-day (uses local calendar date)", () => {
    expect(programDayForDate(start, 8, at(2026, 7, 1, 23))).toEqual({ weekNumber: 1, day: "wed" });
    expect(programDayForDate(start, 8, at(2026, 7, 1, 0))).toEqual({ weekNumber: 1, day: "wed" });
  });
  it("returns null on an invalid date", () => {
    expect(programDayForDate(start, 8, new Date(NaN))).toBeNull();
  });
});

describe("resolveActualDay", () => {
  it("returns null when the session was done on its planned day", () => {
    expect(resolveActualDay("mon", "mon")).toBeNull();
  });
  it("returns the selected day when moved", () => {
    expect(resolveActualDay("mon", "wed")).toBe("wed");
  });
  it("returns null when the selected day is empty", () => {
    expect(resolveActualDay("mon", "")).toBeNull();
  });
});
