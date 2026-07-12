/**
 * Deterministic run paces derived from the athlete's 5K time (Levi's hard rules).
 *
 * All paces are a fixed percentage of the 5K pace PER MILE (5K = 3.10686 mi):
 *   - easy      = 162% of 5K pace/mile
 *   - threshold = 108% of 5K pace/mile
 *   - interval  =  92% of 5K pace/mile
 *   - long      = easy pace to slightly faster (we use ~3% faster than easy)
 *   - tempo     = between threshold and easy (~120% of 5K pace) — not one of the
 *                 named rules, so a sensible fixed default; adjust here if desired.
 *   - fartlek / progression = a blend of easy and threshold pace (shown as a
 *                 range; the volume math uses the midpoint effective pace)
 *   - hybrid runs = threshold pace
 */

import type { RunType } from "./types";

/** 5K distance in miles (5000 m). */
export const FIVE_K_MILES = 5000 / 1609.34; // ≈ 3.10686

export const EASY_PCT = 1.62;
export const THRESHOLD_PCT = 1.08;
export const INTERVAL_PCT = 0.92;
export const TEMPO_PCT = 1.2; // assumption: tempo ≈ 120% of 5K pace (slower than threshold)
export const LONG_FROM_EASY = 0.97; // long run ≈ 3% faster than easy pace

export interface RunPaces {
  /** 5K pace in seconds per mile. */
  fiveKSecPerMile: number;
  easy: number;
  long: number;
  tempo: number;
  threshold: number;
  interval: number;
}

/** Parse "mm:ss" or "h:mm:ss" (or a plain number of minutes) to seconds. */
export function parseTimeToSeconds(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const parts = t.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || Number.isNaN(Number(p)))) {
    const n = Number(t);
    return Number.isFinite(n) ? n * 60 : null; // bare number → minutes
  }
  const nums = parts.map(Number);
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];
  if (nums.length === 1) return nums[0] * 60;
  return null;
}

/** 5K pace in seconds per mile from a total 5K time string. */
export function fiveKSecPerMile(fiveKTime: string): number | null {
  const total = parseTimeToSeconds(fiveKTime);
  if (total === null || total <= 0) return null;
  return total / FIVE_K_MILES;
}

/** Compute the full deterministic pace set, or null if the 5K time is unusable. */
export function computePaces(fiveKTime: string | undefined | null): RunPaces | null {
  if (!fiveKTime) return null;
  const five = fiveKSecPerMile(fiveKTime);
  if (five === null) return null;
  const easy = five * EASY_PCT;
  return {
    fiveKSecPerMile: five,
    easy,
    long: easy * LONG_FROM_EASY,
    tempo: five * TEMPO_PCT,
    threshold: five * THRESHOLD_PCT,
    interval: five * INTERVAL_PCT,
  };
}

/**
 * Effective pace (sec/mile) used to convert a run's distance ↔ duration.
 * Fartlek and progression blend easy + threshold, so their effective pace is
 * the midpoint of the two.
 */
export function effectivePace(runType: RunType, p: RunPaces): number {
  switch (runType) {
    case "easy":
      return p.easy;
    case "long":
      return p.long;
    case "tempo":
      return p.tempo;
    case "threshold":
      return p.threshold;
    case "interval":
      return p.interval;
    case "hybrid_run":
      return p.threshold;
    case "fartlek":
    case "progression":
      return (p.easy + p.threshold) / 2;
    default:
      return p.easy;
  }
}

/** Format seconds/mile as "m:ss". */
export function formatPace(secPerMile: number): string {
  const total = Math.round(secPerMile);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Display pace label for a run. Fartlek/progression show a fast→slow range
 * (threshold to easy); every other run type shows a single pace.
 */
export function paceLabel(runType: RunType, p: RunPaces): string {
  if (runType === "fartlek" || runType === "progression") {
    return `${formatPace(p.threshold)}–${formatPace(p.easy)}`;
  }
  return formatPace(effectivePace(runType, p));
}
