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
