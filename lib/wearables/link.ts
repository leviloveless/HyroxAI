/**
 * Pure helpers for linking synced wearable activities to planned program
 * sessions (Sync-Linking feature, Increment 2). No IO/env — unit-testable.
 *
 * A "linkable session" is one position in a program's schedule that a synced
 * workout can be attached to: (weekNumber, day, sessionIndex) with a label.
 * Race days are excluded — a wearable run isn't a race entry, and the review
 * engine already treats race slots as non-loggable for completeness.
 */

import type { ProgramData, Session } from "@/lib/schemas";

export type LinkableSession = {
  weekNumber: number;
  day: string;
  /** Position within the day's `sessions` array (matches workout_logs.session_index). */
  sessionIndex: number;
  label: string;
};

const RUN_TYPE_LABEL: Record<string, string> = {
  easy: "Easy run",
  fartlek: "Fartlek run",
  progression: "Progression run",
  long: "Long run",
  tempo: "Tempo run",
  threshold: "Threshold run",
  interval: "Interval run",
  hybrid_run: "Hybrid run",
};

const LIFT_TYPE_LABEL: Record<string, string> = {
  upper: "Upper body lift",
  lower: "Lower body lift",
  full: "Full body lift",
};

/** Short human label for a session, used in the link picker. */
export function sessionLabel(session: Session): string {
  switch (session.kind) {
    case "run":
      return RUN_TYPE_LABEL[session.runType] ?? "Run";
    case "lift":
      return LIFT_TYPE_LABEL[session.liftType] ?? "Lift";
    case "hybrid":
      return session.simulation ? "Race Simulation" : "Hybrid (HYROX)";
    case "cardio":
      return "Zone 1–2 cardio";
    case "race":
      return `${session.priority} race`;
  }
  return "Session"; // unreachable — the switch is exhaustive over Session["kind"]
}

/**
 * Flatten a program into every linkable session position, in schedule order.
 * `sessionIndex` is the true index within the day's `sessions` array (so race
 * slots still count toward the index) even though race slots aren't emitted.
 */
export function flattenProgramSessions(program: ProgramData): LinkableSession[] {
  const out: LinkableSession[] = [];
  for (const week of program.weeks) {
    for (const day of week.days) {
      day.sessions.forEach((session, index) => {
        if (session.kind === "race") return; // races aren't wearable-linkable
        out.push({
          weekNumber: week.weekNumber,
          day: day.day,
          sessionIndex: index,
          label: sessionLabel(session),
        });
      });
    }
  }
  return out;
}

/** Encode a session position as a single select-option value. */
export function encodeSessionValue(s: {
  weekNumber: number;
  day: string;
  sessionIndex: number;
}): string {
  return `${s.weekNumber}:${s.day}:${s.sessionIndex}`;
}

/** Parse a select-option value back into a session position, or null if malformed. */
export function decodeSessionValue(
  value: string,
): { weekNumber: number; day: string; sessionIndex: number } | null {
  const parts = value.split(":");
  if (parts.length !== 3) return null;
  const weekNumber = Number(parts[0]);
  const day = parts[1]!;
  const sessionIndex = Number(parts[2]);
  if (!Number.isInteger(weekNumber) || !Number.isInteger(sessionIndex)) return null;
  if (!["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(day)) return null;
  return { weekNumber, day, sessionIndex };
}

// --- Same-day matching (Increment 3, rules #2.1 / #2.2) ---
//
// Program weeks are Monday-anchored: week 1 is the Mon–Sun week containing the
// program's start date (same convention as components/program/format.ts). Given
// a synced activity's calendar date, we invert that to find which program
// (week, day) it lands on — used to suggest a same-day link. Reimplemented here
// (rather than importing format.ts) so this module stays pure and free of the
// engine import chain.

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse "YYYY-MM-DD" as a LOCAL date at midnight (no timezone shift). */
function parseLocalISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

/** Local midnight of the Monday on or before `date` (Mon=0 … Sun=6). */
function localMondayOf(date: Date): Date {
  const weekdayFromMon = (date.getDay() + 6) % 7;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekdayFromMon);
}

/**
 * Which program (week, day) a wearable activity falls on, or null if it's
 * outside the program's calendar span. `activity` is the activity's start time;
 * only its local calendar date is used (time-of-day is ignored).
 */
export function programDayForDate(
  startISO: string,
  durationWeeks: number,
  activity: Date,
): { weekNumber: number; day: string } | null {
  if (Number.isNaN(activity.getTime())) return null;
  const week1Monday = localMondayOf(parseLocalISODate(startISO));
  const activityMidnight = new Date(
    activity.getFullYear(),
    activity.getMonth(),
    activity.getDate(),
  );
  const diffDays = Math.round((activityMidnight.getTime() - week1Monday.getTime()) / MS_PER_DAY);
  if (diffDays < 0) return null;
  const weekNumber = Math.floor(diffDays / 7) + 1;
  if (weekNumber > durationWeeks) return null;
  const dayIndex = diffDays % 7;
  return { weekNumber, day: DAY_KEYS[dayIndex]! };
}
