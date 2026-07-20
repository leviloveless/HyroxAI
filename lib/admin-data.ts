import { createAdminClient } from "@/lib/supabase/admin";
import type { ProgramData } from "@/lib/schemas";
import type {
  ProfileRow,
  WorkoutLogRow,
  ReadinessCheckinRow,
  AdaptationRow,
} from "@/lib/supabase/queries";

/**
 * Admin data access (#15) — SERVICE-ROLE reads across ALL users (bypasses RLS).
 * Every caller must gate on `getAdmin()` (lib/admin) first; nothing here checks
 * authorization itself.
 */

export type AdminUserRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  created_at: string;
  programCount: number;
};

/** All users with a program count, newest first. */
export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: progs }] = await Promise.all([
    admin.from("profiles").select("id, email, first_name, created_at").order("created_at", { ascending: false }),
    admin.from("programs").select("user_id"),
  ]);

  const counts = new Map<string, number>();
  for (const p of (progs as { user_id: string }[] | null) ?? []) {
    counts.set(p.user_id, (counts.get(p.user_id) ?? 0) + 1);
  }
  return ((profiles as { id: string; email: string | null; first_name: string | null; created_at: string }[] | null) ?? []).map(
    (u) => ({ ...u, programCount: counts.get(u.id) ?? 0 }),
  );
}

export type AdminProgramRow = {
  id: string;
  user_id: string;
  name: string | null;
  status: "generating" | "ready" | "failed";
  program_type: string;
  duration_weeks: number;
  start_date: string;
  program_data: ProgramData | null;
  input_snapshot: Record<string, unknown> | null;
  created_at: string;
};

export type CoachingNoteRow = {
  id: string;
  program_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type AdminProgramDetail = {
  program: AdminProgramRow;
  profile: ProfileRow | null;
  logs: WorkoutLogRow[];
  readiness: ReadinessCheckinRow[];
  adaptations: AdaptationRow[];
  notes: CoachingNoteRow[];
};

/** Everything an admin needs to review + coach one program. Null if not found. */
export async function getAdminProgram(programId: string): Promise<AdminProgramDetail | null> {
  const admin = createAdminClient();
  const { data: program } = await admin
    .from("programs")
    .select("id, user_id, name, status, program_type, duration_weeks, start_date, program_data, input_snapshot, created_at")
    .eq("id", programId)
    .maybeSingle();
  if (!program) return null;
  const p = program as AdminProgramRow;

  const [{ data: profile }, { data: logs }, { data: readiness }, { data: adaptations }, notes] =
    await Promise.all([
      admin.from("profiles").select("*").eq("id", p.user_id).maybeSingle(),
      admin
        .from("workout_logs")
        .select("id, program_id, week_number, day, session_index, status, rpe, actuals, note, actual_day, logged_at, updated_at")
        .eq("program_id", programId)
        .order("week_number", { ascending: true }),
      admin
        .from("readiness_checkins")
        .select("week_number, sleep, fatigue, stress, soreness, resting_hr, hrv")
        .eq("program_id", programId)
        .order("week_number", { ascending: true }),
      admin
        .from("adaptations")
        .select("id, program_id, week_number, target_week, decision, rule_applied, signals, revised_targets, created_at")
        .eq("program_id", programId)
        .order("week_number", { ascending: true }),
      listCoachingNotes(programId),
    ]);

  return {
    program: p,
    profile: (profile as ProfileRow | null) ?? null,
    logs: (logs as WorkoutLogRow[] | null) ?? [],
    readiness: (readiness as ReadinessCheckinRow[] | null) ?? [],
    adaptations: (adaptations as AdaptationRow[] | null) ?? [],
    notes,
  };
}

export type AdminProgramListRow = {
  id: string;
  name: string | null;
  status: "generating" | "ready" | "failed";
  program_type: string;
  duration_weeks: number;
  created_at: string;
  user_id: string;
  ownerName: string | null;
  ownerEmail: string | null;
};

/** All programs with their owner, newest first. Service role. */
export async function listProgramsForAdmin(limit = 500): Promise<AdminProgramListRow[]> {
  const admin = createAdminClient();
  const { data: programs } = await admin
    .from("programs")
    .select("id, name, status, program_type, duration_weeks, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (programs as Omit<AdminProgramListRow, "ownerName" | "ownerEmail">[] | null) ?? [];
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, email")
    .in("id", ids);
  const byId = new Map(
    ((profiles as { id: string; first_name: string | null; email: string | null }[] | null) ?? []).map(
      (p) => [p.id, p],
    ),
  );
  return rows.map((r) => ({
    ...r,
    ownerName: byId.get(r.user_id)?.first_name ?? null,
    ownerEmail: byId.get(r.user_id)?.email ?? null,
  }));
}

export type WaitlistRow = {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  sport_goal: string | null;
  current_training: string | null;
  why: string | null;
  status: "applied" | "approved" | "declined";
  created_at: string;
};

/** All coaching-waitlist applications, newest first. Service role. */
export async function listWaitlist(): Promise<WaitlistRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("coaching_waitlist")
    .select("id, user_id, name, email, sport_goal, current_training, why, status, created_at")
    .order("created_at", { ascending: false });
  return (data as WaitlistRow[] | null) ?? [];
}

/** Coaching notes for a program (newest first). Service role. */
export async function listCoachingNotes(programId: string): Promise<CoachingNoteRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("coaching_notes")
    .select("id, program_id, body, created_at, updated_at")
    .eq("program_id", programId)
    .order("created_at", { ascending: false });
  return (data as CoachingNoteRow[] | null) ?? [];
}
