import { describe, it, expect } from "vitest";
import { DAY_KEYS, unloggedSessionsToday, weekHasActivity } from "./triggers";
import type { ProgramWeek, WorkoutLog } from "@/lib/schemas";

/** Minimal week factory — only the fields the trigger logic reads. */
function week(weekNumber: number, days: Record<string, number>): ProgramWeek {
  return {
    weekNumber,
    phase: "build",
    microWeek: "load",
    summary: {} as ProgramWeek["summary"],
    days: Object.entries(days).map(([day, n]) => ({
      day: day as ProgramWeek["days"][number]["day"],
      // n placeholder sessions; only the count matters to the trigger.
      sessions: Array.from({ length: n }, () => ({ kind: "cardio" })),
    })),
  } as unknown as ProgramWeek;
}

function log(weekNumber: number, day: string, sessionIndex: number): WorkoutLog {
  return {
    weekNumber,
    day: day as WorkoutLog["day"],
    sessionIndex,
    status: "completed",
    rpe: null,
    actuals: null,
    note: null,
  };
}

describe("DAY_KEYS", () => {
  it("maps getDay() indices to training-day keys (Sun=0)", () => {
    expect(DAY_KEYS[0]).toBe("sun");
    expect(DAY_KEYS[1]).toBe("mon");
    expect(DAY_KEYS[6]).toBe("sat");
  });
});

describe("unloggedSessionsToday", () => {
  it("returns 0 on a rest day (no sessions)", () => {
    const w = week(3, { mon: 0 });
    expect(unloggedSessionsToday(w, "mon", [])).toBe(0);
  });

  it("returns 0 when the day isn't in the week", () => {
    const w = week(3, { mon: 2 });
    expect(unloggedSessionsToday(w, "sun", [])).toBe(0);
  });

  it("counts every session when none are logged", () => {
    const w = week(3, { tue: 2 });
    expect(unloggedSessionsToday(w, "tue", [])).toBe(2);
  });

  it("excludes sessions already logged (any status)", () => {
    const w = week(3, { tue: 2 });
    const logs = [log(3, "tue", 0)]; // first of two logged
    expect(unloggedSessionsToday(w, "tue", logs)).toBe(1);
  });

  it("returns 0 when all today's sessions are logged", () => {
    const w = week(3, { wed: 2 });
    const logs = [log(3, "wed", 0), log(3, "wed", 1)];
    expect(unloggedSessionsToday(w, "wed", logs)).toBe(0);
  });

  it("does not count logs from other weeks/days as covering today", () => {
    const w = week(3, { thu: 1 });
    const logs = [log(2, "thu", 0), log(3, "fri", 0)];
    expect(unloggedSessionsToday(w, "thu", logs)).toBe(1);
  });
});

describe("weekHasActivity", () => {
  it("is false when the week has no logs", () => {
    expect(weekHasActivity(4, [log(3, "mon", 0)])).toBe(false);
  });

  it("is true when the week has at least one log", () => {
    expect(weekHasActivity(4, [log(4, "mon", 0)])).toBe(true);
  });
});
