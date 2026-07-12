import { describe, it, expect } from "vitest";
import { reconcileWeekVolume } from "./reconcile";
import { weekMileage, weekCardioMinutes, sessionTiming } from "@/lib/session-volume";
import type { ProgramDay, Session } from "@/lib/schemas";

const run = (rt: string, miles: number, dur: number): Session => ({
  kind: "run",
  runType: rt as Extract<Session, { kind: "run" }>["runType"],
  distanceMiles: miles,
  durationMin: dur,
  paceMinMile: "8:00",
  goalZone: 2,
});

const hybrid = (): Session => ({
  kind: "hybrid",
  goalZone: 4,
  elements: [
    { exercise: "run", prescription: "1000m @ 8:00 (threshold)" },
    { exercise: "ski erg", prescription: "500m" },
    { exercise: "run", prescription: "1000m @ 8:00 (threshold)" },
    { exercise: "row erg", prescription: "500m" },
    { exercise: "run", prescription: "1000m @ 8:00 (threshold)" },
    { exercise: "assault bike", prescription: "40 cal" },
    { exercise: "run", prescription: "1000m @ 8:00 (threshold)" },
    { exercise: "wall balls", prescription: "30 reps" },
  ],
});

const lift = (): Session => ({
  kind: "lift",
  liftType: "full",
  movements: [{ pattern: "squat", sets: 4, repRange: "5-7" }],
});

const daysOf = (...sessions: Session[][]): ProgramDay[] =>
  sessions.map((ss, i) => ({
    day: (["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const)[i],
    sessions: ss,
  }));

const maxRunTotal = (days: ProgramDay[]): number =>
  Math.max(
    0,
    ...days.flatMap((d) => d.sessions.filter((s) => s.kind === "run").map((s) => sessionTiming(s).total)),
  );

describe("reconcileWeekVolume — exact weekly sums", () => {
  it("fixes the reported example (11.5 mi / 250 min with an overshooting week)", () => {
    const days = daysOf(
      [run("easy", 3, 24)],
      [hybrid()],
      [lift()],
      [run("fartlek", 5.5, 44)],
      [run("long", 7.5, 60)],
      [],
    );
    reconcileWeekVolume(days, 11.5, 250, "intermediate");
    expect(weekMileage({ days })).toBe(11.5);
    expect(weekCardioMinutes({ days })).toBe(250);
    expect(maxRunTotal(days)).toBeLessThanOrEqual(90);
  });

  it("adds easy runs when volume can't fit existing runs under the 90-min cap", () => {
    const days = daysOf([run("long", 8, 64)], [run("easy", 4, 32)], [lift()]);
    const before = days.flatMap((d) => d.sessions).filter((s) => s.kind === "run").length;
    reconcileWeekVolume(days, 55, 600, "advanced");
    const after = days.flatMap((d) => d.sessions).filter((s) => s.kind === "run").length;
    expect(weekMileage({ days })).toBe(55);
    expect(weekCardioMinutes({ days })).toBe(600);
    expect(maxRunTotal(days)).toBeLessThanOrEqual(90);
    expect(after).toBeGreaterThan(before);
  });

  it("leaves race weeks untouched", () => {
    const days = daysOf([run("easy", 3, 24)], [{ kind: "race", priority: "A" }]);
    const snapshot = JSON.stringify(days);
    reconcileWeekVolume(days, 11.5, 250, "intermediate");
    expect(JSON.stringify(days)).toBe(snapshot);
  });

  it("hits both targets across a sweep of targets, run counts, and hybrids", () => {
    const runTypes = ["easy", "long", "fartlek", "tempo", "threshold", "interval", "progression"];
    for (const nRuns of [1, 2, 3, 4, 6]) {
      for (const withHybrid of [false, true]) {
        for (const mi of [8, 11.5, 20, 35, 60]) {
          for (const min of [180, 250, 400, 650]) {
            const sessions: Session[][] = [];
            for (let i = 0; i < nRuns; i++) sessions.push([run(runTypes[i % runTypes.length], 3 + i, 24 + i * 5)]);
            if (withHybrid) sessions.push([hybrid()]);
            sessions.push([lift()]);
            while (sessions.length < 7) sessions.push([]);
            const days = daysOf(...sessions);
            reconcileWeekVolume(days, mi, min, "intermediate");
            expect(weekMileage({ days })).toBe(mi);
            expect(weekCardioMinutes({ days })).toBe(min);
            expect(maxRunTotal(days)).toBeLessThanOrEqual(90);
          }
        }
      }
    }
  });
});
