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

/** Result of the onboarding-nudge due check. */
export interface OnboardingNudgeDue {
  /** Whole UTC days since signup (== the "2–3 days in" fire window when it fires). */
  daysSinceSignup: number;
  /** Whole trial days remaining, for the email's `daysLeft` copy. */
  daysLeft: number;
}

/**
 * Whether the onboarding nudge is due for a user on this cron run.
 *
 * We nudge users who are ~2–3 days into their trial (i.e. exactly 2 whole UTC days after
 * `trial_started_at` — a single-day window, so the daily cron fires it at most once) and
 * still inside the trial. Comparing UTC day indices (not raw hours) makes it independent
 * of the cron's time-of-day and the signup time. The caller still filters out users who
 * already generated a program or subscribed; this is purely the date gate.
 */
export function onboardingNudgeDue(
  trialStartedAt: string,
  nowMs: number,
  trialDays = 14,
): OnboardingNudgeDue | null {
  const startMs = Date.parse(trialStartedAt);
  if (Number.isNaN(startMs)) return null;
  const daysSinceSignup = utcDayIndex(nowMs) - utcDayIndex(startMs);
  if (daysSinceSignup !== 2) return null; // fire once, 2 days in (the 2–3-day window)
  const daysLeft = trialDays - daysSinceSignup;
  if (daysLeft <= 0) return null; // trial already over → no nudge
  return { daysSinceSignup, daysLeft };
}
