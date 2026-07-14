"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProgramData } from "@/lib/schemas";

const METERS_PER_MILE = 1609.344;
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Day = (typeof DAYS)[number];

export type LinkResult = { ok: true } | { ok: false; error: string };

export type LinkInput = {
  activityId: string;
  programId: string;
  weekNumber: number;
  day: string;
  sessionIndex: number;
  /** Optional session RPE (1–10). Omitted → any existing manual RPE is preserved. */
  rpe?: number;
};

/**
 * Link a synced wearable activity to a planned session by writing a
 * workout_log for that session position, carrying the activity's actuals and a
 * pointer back to the activity. The adaptation engine reads workout_logs, so a
 * linked activity feeds the training science with no engine changes.
 *
 * Safeguards:
 *  - a synced activity maps to at most one session (unique index): we delete any
 *    prior link of this activity before writing the new one;
 *  - existing manual RPE/note on the target session are preserved (we omit those
 *    columns from the upsert unless an RPE is explicitly supplied);
 *  - logs frozen by an applied weekly review can't be changed.
 */
export async function linkActivityToSession(input: LinkInput): Promise<LinkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // --- Validate the target position shape ---
  if (!DAYS.includes(input.day as Day)) return { ok: false, error: "Invalid day." };
  if (!Number.isInteger(input.weekNumber) || input.weekNumber < 1 || input.weekNumber > 24) {
    return { ok: false, error: "Invalid week." };
  }
  if (!Number.isInteger(input.sessionIndex) || input.sessionIndex < 0) {
    return { ok: false, error: "Invalid session." };
  }
  let rpe: number | undefined;
  if (input.rpe !== undefined && input.rpe !== null) {
    if (!Number.isInteger(input.rpe) || input.rpe < 1 || input.rpe > 10) {
      return { ok: false, error: "RPE must be a whole number from 1 to 10." };
    }
    rpe = input.rpe;
  }

  // --- The activity must exist and belong to the caller (RLS-scoped) ---
  const { data: activity } = await supabase
    .from("wearable_activities")
    .select("id, provider, duration_s, distance_m, avg_hr")
    .eq("id", input.activityId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!activity) return { ok: false, error: "Activity not found." };
  const provider = activity.provider as string;
  if (provider !== "strava" && provider !== "garmin") {
    return { ok: false, error: "Unsupported activity source." };
  }

  // --- The target session must exist in a ready program (RLS-scoped) ---
  const { data: program } = await supabase
    .from("programs")
    .select("id, status, program_data")
    .eq("id", input.programId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!program) return { ok: false, error: "Program not found." };
  if (program.status !== "ready") return { ok: false, error: "Program isn't ready yet." };
  const pdata = program.program_data as ProgramData | null;
  const week = pdata?.weeks.find((w) => w.weekNumber === input.weekNumber);
  const session = week?.days.find((d) => d.day === input.day)?.sessions[input.sessionIndex];
  if (!session) return { ok: false, error: "That session no longer exists in this program." };
  if (session.kind === "race") return { ok: false, error: "Race days can't be linked to a synced workout." };

  // --- Frozen once the week's review has been applied (it fed an adaptation) ---
  const { data: applied } = await supabase
    .from("adaptations")
    .select("id")
    .eq("program_id", input.programId)
    .eq("week_number", input.weekNumber)
    .eq("decision", "applied")
    .maybeSingle();
  if (applied) {
    return { ok: false, error: "This week has already been reviewed — its logs are locked." };
  }

  // --- Clear any prior link of THIS activity (keeps the unique index happy and
  //     prevents the same workout counting on two sessions) ---
  await supabase
    .from("workout_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("wearable_activity_id", input.activityId);

  // --- Actuals from the activity ---
  const actuals: { durationMin?: number; distanceMiles?: number; avgHr?: number } = {};
  if (typeof activity.duration_s === "number" && activity.duration_s > 0) {
    actuals.durationMin = Math.round(activity.duration_s / 60);
  }
  if (typeof activity.distance_m === "number" && activity.distance_m > 0) {
    actuals.distanceMiles = Math.round((activity.distance_m / METERS_PER_MILE) * 100) / 100;
  }
  if (typeof activity.avg_hr === "number" && activity.avg_hr > 0) {
    actuals.avgHr = Math.round(activity.avg_hr);
  }

  // Omit `rpe`/`note` from the payload unless an RPE was supplied: on a conflict
  // update PostgREST only SETs the columns present, so an existing manual RPE/note
  // survives the link.
  const payload: Record<string, unknown> = {
    user_id: user.id,
    program_id: input.programId,
    week_number: input.weekNumber,
    day: input.day,
    session_index: input.sessionIndex,
    status: "completed",
    source: provider,
    wearable_activity_id: input.activityId,
    actuals: Object.keys(actuals).length ? actuals : null,
    updated_at: new Date().toISOString(),
  };
  if (rpe !== undefined) payload.rpe = rpe;

  const { error } = await supabase
    .from("workout_logs")
    .upsert(payload, { onConflict: "program_id,week_number,day,session_index" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/activity");
  revalidatePath(`/program/${input.programId}`);
  return { ok: true };
}

/**
 * Remove the link between a synced activity and its session by deleting the
 * workout_log created for it. Only link-created logs carry a wearable_activity_id,
 * so a purely manual log is never touched. Blocked when the week is frozen.
 */
export async function unlinkActivity(activityId: string): Promise<LinkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: log } = await supabase
    .from("workout_logs")
    .select("id, program_id, week_number")
    .eq("user_id", user.id)
    .eq("wearable_activity_id", activityId)
    .maybeSingle();
  if (!log) {
    // Already unlinked — nothing to do.
    revalidatePath("/activity");
    return { ok: true };
  }

  const { data: applied } = await supabase
    .from("adaptations")
    .select("id")
    .eq("program_id", log.program_id)
    .eq("week_number", log.week_number)
    .eq("decision", "applied")
    .maybeSingle();
  if (applied) {
    return { ok: false, error: "This week has already been reviewed — its logs are locked." };
  }

  const { error } = await supabase
    .from("workout_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("wearable_activity_id", activityId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/activity");
  revalidatePath(`/program/${log.program_id}`);
  return { ok: true };
}
