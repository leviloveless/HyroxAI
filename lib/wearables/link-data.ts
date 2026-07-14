import { createClient } from "@/lib/supabase/server";
import type { ProgramData } from "@/lib/schemas";
import { flattenProgramSessions, type LinkableSession } from "./link";

/**
 * A program plus its flattened linkable sessions — the option data the Activity
 * dashboard's link picker needs. Server-only (reads programs via RLS).
 */
export type LinkableProgram = {
  programId: string;
  name: string;
  startDate: string;
  sessions: LinkableSession[];
};

/**
 * All of the caller's `ready` programs with their linkable session positions,
 * newest first. Used to populate the "link this activity to a planned session"
 * picker on the Activity dashboard.
 */
export async function getLinkableSessions(): Promise<LinkableProgram[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("programs")
    .select("id, name, start_date, program_data")
    .eq("user_id", user.id)
    .eq("status", "ready")
    .order("created_at", { ascending: false });

  const programs =
    (rows as { id: string; name: string | null; start_date: string; program_data: ProgramData | null }[] | null) ?? [];

  return programs
    .filter((p) => p.program_data != null)
    .map((p) => ({
      programId: p.id,
      name: p.name ?? "Your training program",
      startDate: p.start_date,
      sessions: flattenProgramSessions(p.program_data as ProgramData),
    }))
    .filter((p) => p.sessions.length > 0);
}
