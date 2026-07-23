/**
 * Concurrent-training sequencing guards (Review #8) — split out of slots.ts
 * (roadmap #2.6).
 *
 * Endurance and strength adaptations interfere (AMPK vs mTOR), and heavy leg
 * work leaves residual fatigue that compromises a quality run the next day. So
 * we keep heavy-leg lifts (lower / full body) off the day BEFORE a key run
 * (long / interval / threshold / tempo). Best-effort + count-preserving: it only
 * relocates onto unprotected days and never onto (or the day before) another key
 * run, and only pushes a "light" session back to the vacated day.
 */

import type { DaySlot, RunType, SessionSlot, SlotPredicate, TrainingDayName } from "./types";

const KEY_RUN_TYPES: ReadonlySet<RunType> = new Set(["long", "interval", "threshold", "tempo"]);
export const isKeyRun: SlotPredicate = (s) => s.kind === "run" && KEY_RUN_TYPES.has(s.runType);
export const isHardLegLift: SlotPredicate = (s) =>
  s.kind === "lift" && (s.liftType === "lower" || s.liftType === "full" || s.liftType === "power");

/** A session light enough to sit the day before a key run (no leg fatigue). */
function isLightSlot(s: SessionSlot): boolean {
  if (s.kind === "rest") return true;
  if (s.kind === "run") return !isKeyRun(s);
  if (s.kind === "lift") return s.liftType === "upper";
  return false; // hybrid / race are not "light"
}

function dayHas(day: DaySlot, pred: SlotPredicate): boolean {
  return day.sessions.some(pred);
}

/** Index of a movable "light" session on a day, or -1. */
function lightIndex(day: DaySlot): number {
  return day.sessions.findIndex(isLightSlot);
}

/**
 * Pick a day to relocate a heavy-leg lift to: unprotected, not a key-run day,
 * not the day before a key run, and able to give back a light session (or empty).
 * Empty days are strongly preferred. Returns the day index, or -1.
 */
function pickSequencingTarget(
  days: DaySlot[],
  keyRunIdx: number,
  protectedDays: Set<TrainingDayName>,
): number {
  const beforeKeyRun = (t: number) => t + 1 < days.length && dayHas(days[t + 1]!, isKeyRun); // safe: t + 1 < days.length
  let best = -1;
  let bestScore = -Infinity;
  for (let t = 0; t < days.length; t++) {
    if (t === keyRunIdx || t === keyRunIdx - 1) continue;
    const day = days[t]!; // safe: t < days.length
    if (protectedDays.has(day.day)) continue;
    if (dayHas(day, isKeyRun)) continue;
    if (beforeKeyRun(t)) continue;
    const empty = day.sessions.length === 0;
    if (!empty && lightIndex(day) === -1) continue; // nothing safe to swap back
    const load = day.sessions.filter((x) => x.kind !== "rest").length;
    const score = (empty ? 100 : 0) - load;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

/** Relocate heavy-leg lifts that sit the day before a key run. */
export function applySequencingGuards(days: DaySlot[], protectedDays: Set<TrainingDayName>): void {
  for (let i = 1; i < days.length; i++) {
    const day = days[i]!; // safe: i < days.length
    if (!dayHas(day, isKeyRun)) continue;
    const prev = days[i - 1]!; // safe: i >= 1
    if (protectedDays.has(prev.day)) continue;
    const j = prev.sessions.findIndex(isHardLegLift);
    if (j === -1) continue;
    const target = pickSequencingTarget(days, i, protectedDays);
    if (target === -1) continue;

    const lift = prev.sessions.splice(j, 1)[0]!; // safe: j is a valid index (!== -1)
    const tgt = days[target]!; // safe: pickSequencingTarget returns a valid index or -1
    if (tgt.sessions.length === 0) {
      tgt.sessions.push(lift);
    } else {
      const di = lightIndex(tgt); // guaranteed ≥ 0 by pickSequencingTarget
      const back = tgt.sessions.splice(di, 1)[0]!; // safe: di ≥ 0 (a light session exists)
      prev.sessions.push(back);
      tgt.sessions.push(lift);
    }
  }
}

// --- Research-aligned scheduling guards (engine-vs-research batch 3) ----------
//
// Two rules from the engine-vs-research gap analysis, applied ONLY for
// research-lift programs (gated at the call site on counts.researchLifts, so the
// golden oracle — which has no weeklyHours — is untouched):
//   1. No two lifts on the same day. A second weight session is relocated to a
//      lift-free day (the research separates concurrent strength sessions).
//   2. Every hard-leg lift day (lower / full / power) is paired with easy Z1–Z2
//      cardio on the SAME day. An easy run is pulled onto it from another day.
// Both are best-effort and session-count-preserving: they only relocate existing
// sessions onto unprotected days and never create or drop a session.

/** Any endurance session that counts as "cardio" for same-day leg-lift pairing. */
function isCardio(s: SessionSlot): boolean {
  return (
    s.kind === "run" ||
    s.kind === "hybrid" ||
    s.kind === "bike" ||
    s.kind === "swim" ||
    s.kind === "brick"
  );
}

/** A movable easy Z1–Z2 run (never the long run or any quality run). */
const isEasyRun: SlotPredicate = (s) => s.kind === "run" && s.runType === "easy";

/** True if placing a hard-leg lift on day `t` would sit it on — or the day
 *  before — a key run, breaking the applySequencingGuards invariant. */
function conflictsWithKeyRun(days: DaySlot[], t: number): boolean {
  if (dayHas(days[t]!, isKeyRun)) return true; // safe: t is a valid index in the caller loop
  return t + 1 < days.length && dayHas(days[t + 1]!, isKeyRun); // safe: t + 1 < days.length
}

/**
 * Pick a lift-free day to relocate an extra lift onto: unprotected, holding no
 * existing lift, and — for hard-leg lifts — clear of key-run fatigue. A day that
 * already has easy cardio is ideal (the moved leg lift auto-pairs); otherwise an
 * empty/light day is preferred. Returns the day index, or -1.
 */
function pickNoLiftDay(
  days: DaySlot[],
  fromIdx: number,
  lift: SessionSlot,
  protectedDays: Set<TrainingDayName>,
): number {
  const legLift = isHardLegLift(lift);
  let best = -1;
  let bestScore = -Infinity;
  for (let t = 0; t < days.length; t++) {
    if (t === fromIdx) continue;
    const day = days[t]!; // safe: t < days.length
    if (protectedDays.has(day.day)) continue;
    if (dayHas(day, (s) => s.kind === "lift")) continue;
    if (legLift && conflictsWithKeyRun(days, t)) continue;
    const load = day.sessions.filter((x) => x.kind !== "rest").length;
    const pairs = legLift && dayHas(day, isCardio) ? 1 : 0; // leg lift onto easy cardio = ideal
    const score = pairs * 200 + (load === 0 ? 50 : 0) - load;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

/** Rule 1: no two lifts on the same day (relocate the extras, keep the first). */
export function separateLifts(days: DaySlot[], protectedDays: Set<TrainingDayName>): void {
  const liftIdxs = (day: DaySlot): number[] =>
    day.sessions.map((s, k) => (s.kind === "lift" ? k : -1)).filter((k) => k >= 0);
  for (let i = 0; i < days.length; i++) {
    const day = days[i]!; // safe: i < days.length
    let idxs = liftIdxs(day);
    while (idxs.length > 1) {
      const moveIdx = idxs[idxs.length - 1]!; // relocate the last lift on the day
      const lift = day.sessions[moveIdx]!; // safe: moveIdx is a valid session index
      const target = pickNoLiftDay(days, i, lift, protectedDays);
      if (target === -1) break; // nowhere safe — leave it (best-effort)
      day.sessions.splice(moveIdx, 1);
      days[target]!.sessions.push(lift); // safe: pickNoLiftDay returns a valid index or -1
      idxs = liftIdxs(day);
    }
  }
}

/**
 * A source day to pull an easy run off, without unpairing another leg lift:
 * unprotected, holding an easy run, and — if it also has a hard-leg lift — with
 * a spare cardio session left behind. Prefers days with no leg lift and the most
 * cardio. Returns the day index, or -1.
 */
function pickEasyRunSource(
  days: DaySlot[],
  destIdx: number,
  protectedDays: Set<TrainingDayName>,
): number {
  let best = -1;
  let bestScore = -Infinity;
  for (let t = 0; t < days.length; t++) {
    if (t === destIdx) continue;
    const day = days[t]!; // safe: t < days.length
    if (protectedDays.has(day.day)) continue;
    if (!dayHas(day, isEasyRun)) continue;
    const cardioCount = day.sessions.filter(isCardio).length;
    const legHere = dayHas(day, isHardLegLift);
    if (legHere && cardioCount <= 1) continue; // don't strip the only cardio off a leg-lift day
    const score = (legHere ? 0 : 100) + cardioCount;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

/** Rule 2: pair every hard-leg-lift day with easy Z1–Z2 cardio on the same day. */
export function pairLegLiftWithCardio(days: DaySlot[], protectedDays: Set<TrainingDayName>): void {
  for (let i = 0; i < days.length; i++) {
    const day = days[i]!; // safe: i < days.length
    if (!dayHas(day, isHardLegLift)) continue;
    if (dayHas(day, isCardio)) continue; // already paired
    const src = pickEasyRunSource(days, i, protectedDays);
    if (src === -1) continue; // no movable easy run — leave it (best-effort)
    const j = days[src]!.sessions.findIndex(isEasyRun);
    if (j === -1) continue; // defensive: pickEasyRunSource guarantees one exists
    const run = days[src]!.sessions.splice(j, 1)[0]!; // safe: j !== -1
    day.sessions.push(run);
  }
}
