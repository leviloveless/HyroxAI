/**
 * HYROX per-event reference bands (#17 projection follow-on) — PURE data + lookups.
 *
 * For each event we store a fast "elite floor" (F) and a slow "novice ceiling" (C)
 * in SECONDS, by sex and (via a multiplier) division and age. These anchor the
 * `headroom` term of the progression model: an athlete near F has little room to
 * improve; one near C has a lot.
 *
 * SOURCES (public, 2026): finish/station bands synthesized from HyroxDataLab
 * (~700k results) and Hyroxy station-split benchmarks; Concept2 informs the ergs.
 * These are PUBLIC estimates — once Duravel has enough of its own athletes' results
 * we should refit F/C (and ideally the model's Imax/τ) on our own data.
 */

export type SexKey = "male" | "female";
export type DivisionKey = "open" | "pro";

/** The benchmark field keys the projection operates on (8 stations + run total + roxzone). */
export const HYROX_EVENT_KEYS = [
  "hyroxRunTotal",
  "hyroxSkiErg",
  "hyroxSledPush",
  "hyroxSledPull",
  "hyroxBurpeeBroadJump",
  "hyroxRow",
  "hyroxFarmersCarry",
  "hyroxSandbagLunge",
  "hyroxWallBalls",
  "hyroxRoxzone",
] as const;
export type HyroxEventKey = (typeof HYROX_EVENT_KEYS)[number];

export interface EventBand {
  /** Fast/elite floor in seconds (near-potential). */
  F: number;
  /** Slow/novice ceiling in seconds (untrained-but-finishing). */
  C: number;
}

/** Human labels (also used by the card). */
export const HYROX_EVENT_LABEL: Record<HyroxEventKey | "finish", string> = {
  hyroxRunTotal: "Running (8×1km)",
  hyroxSkiErg: "SkiErg (1000m)",
  hyroxSledPush: "Sled Push",
  hyroxSledPull: "Sled Pull",
  hyroxBurpeeBroadJump: "Burpee Broad Jump",
  hyroxRow: "Row (1000m)",
  hyroxFarmersCarry: "Farmers Carry",
  hyroxSandbagLunge: "Sandbag Lunges",
  hyroxWallBalls: "Wall Balls",
  hyroxRoxzone: "Roxzone (transitions)",
  finish: "Finish",
};

// Open-division bands, seconds. F = fast edge of "elite", C = "developing" threshold.
const BANDS_OPEN: Record<SexKey, Record<HyroxEventKey | "finish", EventBand>> = {
  male: {
    hyroxRunTotal: { F: 1720, C: 2360 },
    hyroxSkiErg: { F: 225, C: 280 },
    hyroxSledPush: { F: 140, C: 205 },
    hyroxSledPull: { F: 245, C: 340 },
    hyroxBurpeeBroadJump: { F: 270, C: 390 },
    hyroxRow: { F: 235, C: 330 },
    hyroxFarmersCarry: { F: 100, C: 165 },
    hyroxSandbagLunge: { F: 270, C: 370 },
    hyroxWallBalls: { F: 300, C: 510 },
    hyroxRoxzone: { F: 270, C: 540 },
    finish: { F: 4200, C: 6840 },
  },
  female: {
    hyroxRunTotal: { F: 1880, C: 2640 },
    hyroxSkiErg: { F: 250, C: 315 },
    hyroxSledPush: { F: 145, C: 220 },
    hyroxSledPull: { F: 310, C: 410 },
    hyroxBurpeeBroadJump: { F: 360, C: 495 },
    hyroxRow: { F: 285, C: 390 },
    hyroxFarmersCarry: { F: 110, C: 185 },
    hyroxSandbagLunge: { F: 265, C: 360 },
    hyroxWallBalls: { F: 330, C: 540 },
    hyroxRoxzone: { F: 285, C: 555 },
    finish: { F: 5040, C: 7920 },
  },
};

// Pro loads are heavier, so the strength-limited stations run slower; runs/ergs/
// burpee/roxzone are essentially unchanged. Multiplier applied to both F and C.
const PRO_MULT: Partial<Record<HyroxEventKey | "finish", number>> = {
  hyroxSledPush: 1.35,
  hyroxSledPull: 1.1,
  hyroxFarmersCarry: 1.15,
  hyroxSandbagLunge: 1.1,
  hyroxWallBalls: 1.1,
  finish: 1.06,
};

/** Masters slow down ~4%/decade past 35 — a light public-data estimate. */
export function ageFactor(age: number | undefined): number {
  if (age == null || !Number.isFinite(age)) return 1;
  return 1 + Math.min(Math.max(age - 35, 0), 40) * 0.004;
}

function normalizeSex(sex: string | undefined): SexKey {
  return sex === "female" || sex === "f" ? "female" : "male";
}
function normalizeDivision(division: string | undefined): DivisionKey {
  return division === "pro" ? "pro" : "open";
}

/**
 * Reference band for one event, adjusted for sex, division and age. Falls back to
 * the male Open table when sex is unknown (bands are only a scaling reference).
 */
export function eventBand(
  key: HyroxEventKey | "finish",
  sex: string | undefined,
  division: string | undefined,
  age: number | undefined,
): EventBand {
  const base = BANDS_OPEN[normalizeSex(sex)][key];
  const pro = normalizeDivision(division) === "pro" ? (PRO_MULT[key] ?? 1) : 1;
  const af = ageFactor(age);
  const m = pro * af;
  return { F: base.F * m, C: base.C * m };
}
