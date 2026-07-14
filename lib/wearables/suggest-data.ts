import { createClient } from "@/lib/supabase/server";
import type { ProgramData } from "@/lib/schemas";
import { getUserActivities } from "./activities";
import { programDayForDate, sessionLabel, type LinkableSession } from "./link";
import { formatDurationS, formatDistanceMiles, formatActivityType } from "./format";

/**
 * A same-day link suggestion (Sync-Linking Increment 3, rules #2.1 / #2.2): an
 * unlinked synced activity whose calendar date lands on a program day that has
 * at least one planned (non-race) session. `candidates` are the planned sessions
 * on that day — one for a straight confirm, several for the multi-session picker.
 */
export type SyncSuggestion = {
  activityId: string;
  title: string;
  detail: string;
  weekNumber: number;
  day: string;
  candidates: LinkableSession[];
};

function detailLine(startTime: string, durationS: number | null, distanceM: number | null): string {
  const parts: string[] = [];
  const d = new Date(startTime);
  if (!Number.isNaN(d.getTime())) {
    parts.push(d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }));
  }
  if (distanceM) {
    const dist = formatDistanceMiles(distanceM);
    if (dist !== "—") parts.push(dist);
  }
  const dur = formatDurationS(durationS);
  if (dur !== "—") parts.push(dur);
  return parts.join(" · ");
}

/**
 * Suggestions for a single program: unlinked synced activities matched to a
 * same-day planned session. Newest activity first (getUserActivities order).
 * Returns [] for non-ready programs or when nothing matches.
 */
export async function getSyncSuggestions(programId: string): Promise<SyncSuggestion[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: program } = await supabase
    .from("programs")
    .select("id, status, start_date, duration_weeks, program_data")
    .eq("id", programId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!program || program.status !== "ready") return [];
  const pdata = program.program_data as ProgramData | null;
  if (!pdata) return [];

  const activities = await getUserActivities();
  const unlinked = activities.filter((a) => !a.linked && a.start_time);
  if (unlinked.length === 0) return [];

  const suggestions: SyncSuggestion[] = [];
  for (const a of unlinked) {
    const when = new Date(a.start_time as string);
    const match = programDayForDate(program.start_date, program.duration_weeks, when);
    if (!match) continue;

    const week = pdata.weeks.find((w) => w.weekNumber === match.weekNumber);
    const dayObj = week?.days.find((d) => d.day === match.day);
    if (!dayObj) continue;

    const candidates: LinkableSession[] = [];
    dayObj.sessions.forEach((s, i) => {
      if (s.kind === "race") return;
      candidates.push({
        weekNumber: match.weekNumber,
        day: match.day,
        sessionIndex: i,
        label: sessionLabel(s),
      });
    });
    if (candidates.length === 0) continue;

    suggestions.push({
      activityId: a.id,
      title: formatActivityType(a.type),
      detail: detailLine(a.start_time as string, a.duration_s, a.distance_m),
      weekNumber: match.weekNumber,
      day: match.day,
      candidates,
    });
  }
  return suggestions;
}
