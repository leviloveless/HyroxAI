/**
 * HYROX projected-times model (#17 projection follow-on) — PURE, unit-tested.
 *
 * Projects an athlete's expected finish / run / per-station times at the END of a
 * program from their most recent result, scaled by:
 *   - Imax(experience)      — training age is the biggest lever
 *   - trainability(event)   — aerobic events move more than max-strength ones
 *   - headroom(current, F,C)— faster-than-potential ⇒ less to gain (diminishing returns)
 *   - saturation(weeks)     — longer program ⇒ more, but front-loaded
 *
 * projected = current × (1 − Imax · trainability · headroom · saturation),
 * floored at F·0.98 so nobody is projected past an elite time.
 *
 * Calibrated so outputs reproduce the running / erg / VO2max literature
 * (see Duravel_Projected_Times_Plan.md). Read-only: does NOT touch program assembly.
 */

import {
  HYROX_EVENT_KEYS,
  HYROX_EVENT_LABEL,
  eventBand,
  type HyroxEventKey,
} from "./hyrox-standards";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type RaceType = "singles" | "doubles" | "relay" | "unknown";

/** Asymptotic best-case fractional improvement from one focused block, by training age. */
const IMAX: Record<ExperienceLevel, number> = {
  beginner: 0.14,
  intermediate: 0.07,
  advanced: 0.035,
};

/** Per-event trainability relative to running (aerobic = most trainable). */
const TRAINABILITY: Record<HyroxEventKey, number> = {
  hyroxRunTotal: 1.0,
  hyroxSkiErg: 0.9,
  hyroxRow: 0.9,
  hyroxWallBalls: 0.85,
  hyroxBurpeeBroadJump: 0.8,
  hyroxSandbagLunge: 0.75,
  hyroxFarmersCarry: 0.7,
  hyroxSledPush: 0.6,
  hyroxSledPull: 0.6,
  hyroxRoxzone: 0.5,
};

/** Saturation time-constant (weeks): 12wk≈0.66, 24wk≈0.89. */
const TAU = 11;
export function saturation(weeks: number): number {
  if (!Number.isFinite(weeks) || weeks <= 0) return 0;
  return 1 - Math.exp(-weeks / TAU);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Parse "mm:ss" / "h:mm:ss" / "hh:mm:ss" → seconds. Null on anything unparseable. */
export function parseClock(v: string | number | undefined | null): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
  if (typeof v !== "string") return null;
  const parts = v.trim().split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const secs =
    nums.length === 3
      ? nums[0]! * 3600 + nums[1]! * 60 + nums[2]!
      : nums[0]! * 60 + nums[1]!;
  return secs > 0 ? secs : null;
}

/** Seconds → "h:mm:ss" (or "m:ss" under an hour). */
export function formatClock(sec: number): string {
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export interface ProjectionContext {
  runningExp: ExperienceLevel;
  hybridExp: ExperienceLevel;
  weeks: number;
  sex?: string;
  division?: string;
  age?: number;
}

export interface ProjectedEvent {
  key: HyroxEventKey;
  label: string;
  currentSec: number;
  projectedSec: number;
  current: string;
  projected: string;
  /** Percent improvement (positive = faster). */
  improvementPct: number;
}

export interface ProjectedTimes {
  perEvent: ProjectedEvent[];
  /** Full-race projection, only when every event is present and the result is singles. */
  finishCurrentSec: number | null;
  finishProjectedSec: number | null;
  finishCurrent: string | null;
  finishProjected: string | null;
  raceType: RaceType;
  /** Human note when the projection is partial (e.g. doubles) or empty. */
  note?: string;
}

/** Runs use running experience; stations + transitions use hybrid experience. */
function expForEvent(key: HyroxEventKey, ctx: ProjectionContext): ExperienceLevel {
  return key === "hyroxRunTotal" ? ctx.runningExp : ctx.hybridExp;
}

/** Project a single event from its current time in seconds. */
export function projectEvent(
  key: HyroxEventKey,
  currentSec: number,
  ctx: ProjectionContext,
): ProjectedEvent {
  const band = eventBand(key, ctx.sex, ctx.division, ctx.age);
  const headroom = clamp((currentSec - band.F) / (band.C - band.F), 0.05, 1);
  const frac = IMAX[expForEvent(key, ctx)] * TRAINABILITY[key] * headroom * saturation(ctx.weeks);
  const floored = Math.max(currentSec * (1 - frac), band.F * 0.98);
  const projectedSec = Math.min(floored, currentSec); // never project slower
  return {
    key,
    label: HYROX_EVENT_LABEL[key],
    currentSec,
    projectedSec,
    current: formatClock(currentSec),
    projected: formatClock(projectedSec),
    improvementPct: currentSec > 0 ? ((currentSec - projectedSec) / currentSec) * 100 : 0,
  };
}

/**
 * Project all present HYROX events + (when complete & singles) the finish.
 *
 * `benchmarks` is the profile benchmarks object; only the `hyrox*` string fields
 * are read. Doubles/relay results have shared-effort station splits, so those are
 * excluded — only running is projected — with an explanatory note.
 */
export function projectTimes(
  benchmarks: Record<string, string | number | undefined> | undefined | null,
  ctx: ProjectionContext,
  raceType: RaceType = "singles",
): ProjectedTimes {
  const b = benchmarks ?? {};
  const shared = raceType === "doubles" || raceType === "relay";
  const perEvent: ProjectedEvent[] = [];

  for (const key of HYROX_EVENT_KEYS) {
    // For shared-format results, only the run legs are individual efforts.
    if (shared && key !== "hyroxRunTotal") continue;
    const sec = parseClock(b[key]);
    if (sec == null) continue;
    perEvent.push(projectEvent(key, sec, ctx));
  }

  // A finish number is only meaningful for a singles result with the full set.
  const haveAll = HYROX_EVENT_KEYS.every((k) => perEvent.some((e) => e.key === k));
  let finishCurrentSec: number | null = null;
  let finishProjectedSec: number | null = null;
  if (!shared && haveAll) {
    finishCurrentSec = perEvent.reduce((s, e) => s + e.currentSec, 0);
    finishProjectedSec = perEvent.reduce((s, e) => s + e.projectedSec, 0);
  }

  let note: string | undefined;
  if (perEvent.length === 0) {
    note = "Add your HYROX event splits (or look up a result) to see projected times.";
  } else if (shared) {
    note =
      "Doubles/relay result — station splits are shared between partners, so only your " +
      "running is projected. Enter singles station times for a full projection.";
  } else if (!haveAll) {
    note = "Enter all event splits (or import a singles result) for a full finish projection.";
  }

  return {
    perEvent,
    finishCurrentSec,
    finishProjectedSec,
    finishCurrent: finishCurrentSec != null ? formatClock(finishCurrentSec) : null,
    finishProjected: finishProjectedSec != null ? formatClock(finishProjectedSec) : null,
    raceType,
    note,
  };
}
