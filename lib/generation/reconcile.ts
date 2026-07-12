/**
 * Deterministic weekly-volume reconciliation.
 *
 * The periodization engine prescribes each week's total running mileage
 * (`targetMileage`) and total cardio time (`targetCardioMinutes`). The AI fills
 * concrete per-session distances/durations but can't be trusted to make them
 * SUM to those totals. This pass rewrites the run sessions so the week's
 * running mileage and cardio time equal the engine targets exactly — no prompt
 * reliance.
 *
 * Rules (per Levi):
 *   - Honor the prescribed totals exactly (runs shrink/grow to fit).
 *   - Cap any single run at 90 minutes (total time incl. warmup/cooldown).
 *   - When the volume can't fit the existing runs under the 90-min cap, ADD
 *     easy run sessions to carry the remainder.
 *
 * Hybrid sessions are structural (4×1000 m runs + events) and are left as-is;
 * their fixed mileage/time is subtracted from the target before distributing
 * the remainder across the pure runs. Lifts/rest/race are untouched.
 */

import type { ProgramDay, Session } from "@/lib/schemas";
import type { ExperienceLevel, RunType } from "@/lib/engine/types";
import {
  hybridRunMiles,
  runOverhead,
  sessionMiles,
  sessionTiming,
  weekCardioMinutes,
  weekMileage,
} from "@/lib/session-volume";
import { runDescription } from "@/lib/engine/run-descriptions";

type RunSession = Extract<Session, { kind: "run" }>;

const MAX_RUN_MINUTES = 90; // cap on a single run's total time (incl. warmup/cooldown)
const MIN_RUN_MILES = 0.5;
const MIN_RUN_WORK = 1;
const MIN_PACE = 3.5; // min/mile clamp for sanity
const MAX_PACE = 16;

/** Relative distance share by run type when the AI gave no usable distance. */
const TYPE_WEIGHT: Record<RunType, number> = {
  long: 2.0,
  progression: 1.3,
  fartlek: 1.2,
  tempo: 1.1,
  threshold: 1.1,
  interval: 1.0,
  easy: 1.0,
  hybrid_run: 1.0,
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function fmtPace(minPerMile: number): string {
  const p = Math.min(MAX_PACE, Math.max(MIN_PACE, minPerMile));
  const total = Math.round(p * 60);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}

/** A mutable working copy of one run being reconciled. */
interface RunWork {
  ref: RunSession;
  runType: RunType;
  overhead: number; // warmup + cooldown minutes (fixed)
  miles: number;
  work: number; // work minutes (durationMin)
}

/** Make an easy-run session carrying `miles` over `work` work-minutes. */
function makeEasyRun(miles: number, work: number, runningExp: ExperienceLevel): RunSession {
  const d = Math.max(MIN_RUN_MILES, round1(miles));
  const w = Math.max(MIN_RUN_WORK, Math.round(work));
  return {
    kind: "run",
    runType: "easy",
    distanceMiles: d,
    durationMin: w,
    paceMinMile: fmtPace(w / d),
    goalZone: 2,
    description: runDescription("easy", runningExp),
  };
}

/** Index of the day with the fewest sessions (rest days = empty). */
function leastLoadedDay(days: ProgramDay[]): number {
  let best = 0;
  for (let i = 1; i < days.length; i++) {
    if (days[i].sessions.length < days[best].sessions.length) best = i;
  }
  return best;
}

/**
 * Reconcile one week's run volume in place so its running mileage and cardio
 * minutes equal the engine targets. `days` is mutated.
 */
export function reconcileWeekVolume(
  days: ProgramDay[],
  targetMileage: number,
  targetCardioMinutes: number,
  runningExp: ExperienceLevel,
): void {
  // Race weeks are handled separately — never rescale them.
  const hasRace = days.some((d) => d.sessions.some((s) => s.kind === "race"));
  if (hasRace) return;

  // Fixed contribution from hybrid sessions.
  let hybridMi = 0;
  let hybridMin = 0;
  for (const d of days) {
    for (const s of d.sessions) {
      if (s.kind === "hybrid") {
        hybridMi += hybridRunMiles(s);
        hybridMin += sessionTiming(s).total;
      }
    }
  }

  const RM = Math.max(0, round1(targetMileage - hybridMi)); // miles for pure runs
  const RT = Math.max(0, Math.round(targetCardioMinutes - hybridMin)); // total minutes for pure runs
  if (RM <= 0 && RT <= 0) return;

  // Collect the pure run sessions.
  const runs: RunWork[] = [];
  for (const d of days) {
    for (const s of d.sessions) {
      if (s.kind === "run") {
        runs.push({
          ref: s,
          runType: s.runType,
          overhead: runOverhead(s.runType),
          miles: 0,
          work: 0,
        });
      }
    }
  }

  const added: RunSession[] = [];

  if (runs.length === 0) {
    // No runs placed but volume to cover — build it entirely from easy runs.
    added.push(...buildRunsFor(RM, RT, runningExp));
  } else {
    distributeAcross(runs, RM, RT);
    // Cap each run at 90 min; overflow (miles + minutes) goes into new easy runs.
    let overflowMi = 0;
    let overflowMin = 0;
    for (const r of runs) {
      const total = r.overhead + r.work;
      if (total > MAX_RUN_MINUTES) {
        const pace = r.work / Math.max(r.miles, 0.01); // min/mile at current allocation
        const newWork = MAX_RUN_MINUTES - r.overhead;
        const newMiles = newWork / pace;
        overflowMin += total - MAX_RUN_MINUTES;
        overflowMi += r.miles - newMiles;
        r.work = newWork;
        r.miles = newMiles;
      }
    }
    if (overflowMi > 0.05 || overflowMin > 0.5) {
      added.push(...buildRunsFor(overflowMi, overflowMin, runningExp));
    }
    // Write the reconciled numbers back onto the existing run sessions.
    for (const r of runs) {
      r.ref.distanceMiles = Math.max(MIN_RUN_MILES, round1(r.miles));
      r.ref.durationMin = Math.max(MIN_RUN_WORK, Math.round(r.work));
      r.ref.paceMinMile = fmtPace(r.ref.durationMin / r.ref.distanceMiles);
    }
  }

  // Place any added easy runs on the least-loaded days.
  for (const run of added) {
    days[leastLoadedDay(days)].sessions.push(run);
  }

  // Final true-up: snap the largest run so the week's sums equal the targets
  // exactly at display precision (absorbs rounding + pace clamping).
  trueUp(days, targetMileage, targetCardioMinutes);
}

/** Distribute RM miles and RT total-minutes across the given runs (proportional
 *  to a distance weight; longer/priority runs get more). */
function distributeAcross(runs: RunWork[], RM: number, RT: number): void {
  const weights = runs.map((r) =>
    r.ref.distanceMiles && r.ref.distanceMiles > 0 ? r.ref.distanceMiles : TYPE_WEIGHT[r.runType],
  );
  const wsum = weights.reduce((a, b) => a + b, 0) || runs.length;

  for (let i = 0; i < runs.length; i++) runs[i].miles = Math.max(MIN_RUN_MILES, (RM * weights[i]) / wsum);

  const overheadSum = runs.reduce((a, r) => a + r.overhead, 0);
  const workBudget = Math.max(runs.length * MIN_RUN_WORK, RT - overheadSum);
  const mileSum = runs.reduce((a, r) => a + r.miles, 0) || 1;
  for (const r of runs) r.work = Math.max(MIN_RUN_WORK, (workBudget * r.miles) / mileSum);
}

/** Build easy run sessions carrying `miles` over `totalMinutes` (incl. warmup/
 *  cooldown), split so no run exceeds the 90-minute cap. */
function buildRunsFor(miles: number, totalMinutes: number, runningExp: ExperienceLevel): RunSession[] {
  const mi = Math.max(0, miles);
  const min = Math.max(0, totalMinutes);
  if (mi <= 0 && min <= 0) return [];
  const n = Math.max(1, Math.ceil(min / MAX_RUN_MINUTES));
  const overhead = runOverhead("easy");
  const out: RunSession[] = [];
  for (let i = 0; i < n; i++) {
    const totalK = min / n;
    const workK = Math.max(MIN_RUN_WORK, totalK - overhead);
    out.push(makeEasyRun(mi / n, workK, runningExp));
  }
  return out;
}

/** Adjust runs so weekMileage == targetMileage and weekCardioMinutes ==
 *  targetCardioMinutes exactly (diffs are only rounding-sized). */
function trueUp(days: ProgramDay[], targetMileage: number, targetCardioMinutes: number): void {
  const runRefs: RunSession[] = [];
  for (const d of days) for (const s of d.sessions) if (s.kind === "run") runRefs.push(s);
  if (runRefs.length === 0) return;

  // Mileage: dump the remainder on the longest run.
  const diffMi = round1(targetMileage - weekMileage({ days }));
  if (Math.abs(diffMi) >= 0.1) {
    const anchor = runRefs.reduce((a, b) => (b.distanceMiles > a.distanceMiles ? b : a));
    anchor.distanceMiles = Math.max(MIN_RUN_MILES, round1(anchor.distanceMiles + diffMi));
    anchor.paceMinMile = fmtPace(anchor.durationMin / anchor.distanceMiles);
  }

  // Cardio minutes: spread the remainder onto runs with headroom under the cap.
  let diffMin = targetCardioMinutes - weekCardioMinutes({ days });
  if (diffMin !== 0) {
    const byHeadroom = [...runRefs].sort(
      (a, b) => headroom(b) - headroom(a),
    );
    for (const r of byHeadroom) {
      if (diffMin === 0) break;
      if (diffMin > 0) {
        const room = headroom(r);
        const add = Math.min(diffMin, room);
        if (add <= 0) continue;
        r.durationMin += add;
        diffMin -= add;
      } else {
        const reducible = Math.max(0, r.durationMin - MIN_RUN_WORK);
        const cut = Math.min(-diffMin, reducible);
        if (cut <= 0) continue;
        r.durationMin -= cut;
        diffMin += cut;
      }
      r.paceMinMile = fmtPace(r.durationMin / r.distanceMiles);
    }
  }
}

/** Minutes a run can still grow before hitting the 90-min total cap. */
function headroom(r: RunSession): number {
  return Math.max(0, MAX_RUN_MINUTES - sessionTiming(r).total);
}
