import type { TrialEndingStage } from "../templates/types";

/**
 * Pure due-detection for scheduled email flows. No side effects, no server-only
 * imports — unit-tested. The flow orchestrators (server-only) import these to decide
 * who is due on a given cron run.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole UTC-calendar-day index (days since epoch). Same value for any two instants on the same UTC date. */
function utcDayIndex(ms: number): number {
  return Math.floor(ms / DAY_MS);
}

/**
 * Which trial-ending stage (if any) is due for a user on this cron run.
 *
 * The trial ends on `trial_started_at + trialDays`. We compare the trial-end UTC date
 * to today's UTC date (not raw hours), so the stage is stable regardless of the
 * cron's time-of-day or the trial's start time:
 *   - end date is 3 days out  → T-3
 *   - end date is 1 day out   → T-1
 *   - end date is today       → T-0
 *   - anything else (incl. already past) → null (no send; a long-expired trial never fires)
 *
 * The daily cron therefore sends at most one stage per user per day, and never
 * re-emails a trial that ended before today.
 */
export function trialStageDue(
  trialStartedAt: string,
  nowMs: number,
  trialDays = 14,
): TrialEndingStage | null {
  const startMs = Date.parse(trialStartedAt);
  if (Number.isNaN(startMs)) return null;
  const endMs = startMs + trialDays * DAY_MS;
  const diff = utcDayIndex(endMs) - utcDayIndex(nowMs);
  if (diff === 3) return "T-3";
  if (diff === 1) return "T-1";
  if (diff === 0) return "T-0";
  return null;
}
