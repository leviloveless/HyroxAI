/**
 * Time-budget -> volume + intensity-distribution mapping (Phase 1 of the
 * volume-vs-intensity work). Pure and deterministic. These functions are only
 * invoked when the athlete supplied a `weeklyHours` band, so the legacy
 * (no-band) path is untouched and the golden-HYROX oracle stays byte-identical.
 *
 * Research basis: docs/research/Duravel_Volume-Intensity_Research_Report.
 * Numbers are intentionally conservative and tunable; the per-(sport,band)
 * snapshot tests freeze the resulting skeletons for review.
 */
import type { WeeklyHoursBand } from "@/lib/schemas";
import type { PhaseName, ZoneDistribution } from "./types";

/**
 * Starting weekly running mileage for a single-currency sport (HYROX / DEKA /
 * general fitness) by budget. The microcycle progression grows this toward a
 * peak near the top of the band; cardio minutes derive from it exactly as in
 * the legacy path (startingCardioMinutes = mileage x avgMinPerMile). Anchored so
 * h0_5 ~= beginner, h5_10 ~= intermediate, h10_20 ~= advanced (the legacy
 * experience defaults 12/22/35), then scaled up for the elite budgets.
 */
export const BAND_START_MILEAGE: Record<WeeklyHoursBand, number> = {
  h0_5: 10,
  h5_10: 20,
  h10_20: 37,
  // Impact guardrail: high budgets cap RUNNING mileage below the raw
  // hours-equivalent (60 / 87). The surplus aerobic volume is carried by
  // BAND_START_CARDIO_MIN and routed to low-impact cardio by the reconciler.
  h20_30: 48,
  h30_40: 55,
};

/**
 * Total starting weekly cardio MINUTES by band — decoupled from running
 * mileage so that at high budgets the surplus aerobic volume goes to low-impact
 * cardio (bike / row / ski) instead of more running impact. For low/mid budgets
 * this equals mileage x avgMinPerMile (18), so their output is unchanged; only
 * h20_30 / h30_40 sit above the capped running mileage.
 */
export const BAND_START_CARDIO_MIN: Record<WeeklyHoursBand, number> = {
  h0_5: 180,
  h5_10: 360,
  h10_20: 666,
  h20_30: 1080,
  h30_40: 1560,
};

export function bandStartCardioMinutes(band: WeeklyHoursBand): number {
  return BAND_START_CARDIO_MIN[band];
}

/** Per-discipline (triathlon) [baseHours, peakHours] by budget. Base is where
 *  the program starts; the held level climbs to peak across the working weeks. */
export const BAND_TRI_HOURS: Record<WeeklyHoursBand, [number, number]> = {
  h0_5: [3, 5],
  h5_10: [6, 10],
  h10_20: [10, 16],
  h20_30: [18, 26],
  h30_40: [26, 36],
};

/**
 * Intensity shift by budget, in percentage points added to the "middle"
 * (threshold/tempo) pool z3+z4, taken from (or given to) the easy pool z1+z2.
 * z5 (VO2/hard) is held. This encodes the core finding: at low volume the mix
 * leans to threshold (positive delta); at high volume it polarizes into a big
 * easy base with less gray-zone (negative delta). h10_20 is the neutral anchor.
 */
export const BAND_MIDDLE_DELTA: Record<WeeklyHoursBand, number> = {
  h0_5: 8,
  h5_10: 4,
  h10_20: 0,
  h20_30: -3,
  h30_40: -6,
};

export function bandStartMileage(band: WeeklyHoursBand): number {
  return BAND_START_MILEAGE[band];
}

export function bandTriHours(band: WeeklyHoursBand): [number, number] {
  return BAND_TRI_HOURS[band];
}

/**
 * Section 6 structure targets ~5–6 quality anchors + easy filler per week, NOT
 * the 8–10 fragmented touchpoints the phase/experience count model produces. A
 * band athlete's TOTAL weekly sessions are capped to this research-shaped budget;
 * the trim comes off easy filler runs first (and, for run-dominant sports,
 * surplus hybrids), so the long run + quality anchors (threshold / VO2) and the
 * research lift dose are preserved. Higher budgets support more anchors.
 */
export const BAND_SESSION_CAP: Record<WeeklyHoursBand, number> = {
  h0_5: 5,
  h5_10: 6,
  h10_20: 8,
  h20_30: 10,
  h30_40: 12,
};

/**
 * Runs preserved when trimming to the session cap. Protects the long run plus
 * the quality anchors buildRunSlots seeds first. At the lowest budget only the
 * long run + one VO2 anchor are guaranteed (research protects VO2 first), so the
 * floor is 2; from 5 h up the long + threshold + VO2 trio is held (floor 3).
 */
export const BAND_ANCHOR_RUN_FLOOR: Record<WeeklyHoursBand, number> = {
  h0_5: 2,
  h5_10: 3,
  h10_20: 3,
  h20_30: 3,
  h30_40: 3,
};

export function bandSessionCap(band: WeeklyHoursBand): number {
  return BAND_SESSION_CAP[band];
}

export function bandAnchorRunFloor(band: WeeklyHoursBand): number {
  return BAND_ANCHOR_RUN_FLOOR[band];
}

/** Split an integer `total` across two channels in the ratio a:b, exactly:
 *  the two returned integers always sum back to `total` (no rounding drift). */
function splitProportional(total: number, a: number, b: number): [number, number] {
  if (a + b <= 0) return [total, 0];
  const first = Math.round((total * a) / (a + b));
  return [first, total - first];
}

/**
 * Apply the budget's intensity shift to one phase's zone distribution.
 * Preserves the exact sum of the input (a 100-sum distribution stays 100),
 * never lets a pool go negative, and holds z5.
 */
export function applyBandZoneShift(
  base: ZoneDistribution,
  band: WeeklyHoursBand,
): ZoneDistribution {
  const delta = BAND_MIDDLE_DELTA[band];
  if (delta === 0) return { ...base };
  const easy = base.z1 + base.z2;
  const mid = base.z3 + base.z4;
  // Bounded move: cannot take more than the easy pool holds, nor remove more
  // than the middle pool holds.
  const d = Math.max(-mid, Math.min(delta, easy));
  const newEasy = easy - d;
  const newMid = mid + d;
  const [z1, z2] = splitProportional(newEasy, base.z1, base.z2);
  const [z3, z4] = splitProportional(newMid, base.z3, base.z4);
  return { z1, z2, z3, z4, z5: base.z5 };
}

/** Research Section 6 three-zone target {easy, gray, hard} (Z1/Z2/Z3) — `hard` is
 *  above-threshold / VO2 work (engine z5). Supplied per weekly-hours band by a
 *  sport's config; drives the zone distribution when the athlete gives a budget. */
export type ThreeZone = { easy: number; gray: number; hard: number };

/** Per-phase tilt (percentage points of the HARD pool) around the band anchor:
 *  Base sits easier, Peak more polarized/intense, so the plan still periodizes
 *  while its program average tracks the research target for the budget. */
const PHASE_HARD_TILT: Record<PhaseName, number> = { base: -4, build: -1, peak: 5, taper: 0 };

/**
 * Build one phase's 5-zone target from the sport's research 3-zone band target.
 * SCALES true high-intensity (z5) by budget — the finding the flat band shift
 * missed — while preserving phase periodization and summing to exactly 100.
 *   research Z1 (easy) -> engine z1 + z2   |   Z2 (gray) -> z3 + z4   |   Z3 (hard) -> z5
 */
export function bandPhaseZoneTargets(
  phase: PhaseName,
  band: WeeklyHoursBand,
  table: Record<WeeklyHoursBand, ThreeZone>,
): ZoneDistribution {
  const a = table[band];
  const hard = Math.max(3, a.hard + (PHASE_HARD_TILT[phase] ?? 0));
  const gray = a.gray;
  const easy = Math.max(0, 100 - gray - hard);
  const z1 = Math.round(easy * 0.25);
  const z2 = easy - z1;
  const z3 = Math.round(gray * 0.6);
  const z4 = gray - z3;
  return { z1, z2, z3, z4, z5: hard };
}
