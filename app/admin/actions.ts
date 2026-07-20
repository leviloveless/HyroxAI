"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdmin } from "@/lib/admin";
import { ProgramDataSchema } from "@/lib/schemas";
import { generateProgram } from "@/lib/generation/generate-program";

/**
 * Admin console server actions (#15) — every one gates on getAdmin() first, then
 * uses the service-role client to act across users. Reads/writes here bypass RLS
 * by design, so the getAdmin() check is the ONLY thing standing between these and
 * a full data breach — never remove it.
 */

export type AdminResult = { ok: true } | { ok: false; error: string };

/** Add a coaching note to a program (visible to the athlete). */
export async function addCoachingNote(programId: string, body: string): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };
  const text = body.trim();
  if (!text) return { ok: false, error: "Note is empty." };
  if (text.length > 4000) return { ok: false, error: "Note is too long (4000 max)." };

  const db = createAdminClient();
  const { data: program } = await db.from("programs").select("user_id").eq("id", programId).maybeSingle();
  const ownerId = (program as { user_id?: string } | null)?.user_id;
  if (!ownerId) return { ok: false, error: "Program not found." };

  const { error } = await db.from("coaching_notes").insert({
    program_id: programId,
    user_id: ownerId,
    body: text,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/program/${programId}`);
  revalidatePath(`/program/${programId}`);
  return { ok: true };
}

/** Delete a coaching note. */
export async function deleteCoachingNote(noteId: string, programId: string): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };
  const db = createAdminClient();
  const { error } = await db.from("coaching_notes").delete().eq("id", noteId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/program/${programId}`);
  revalidatePath(`/program/${programId}`);
  return { ok: true };
}

/**
 * Replace a program's `program_data` with a hand-edited version. The JSON is
 * validated against the canonical ProgramDataSchema, so an admin can edit any
 * aspect of the plan but can never persist a shape that would break the app.
 */
export async function updateProgramData(programId: string, json: string): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "Not valid JSON." };
  }
  const result = ProgramDataSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, error: `Schema error: ${first?.path.join(".")} — ${first?.message}` };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("programs")
    .update({ program_data: result.data, status: "ready" })
    .eq("id", programId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/program/${programId}`);
  revalidatePath(`/program/${programId}`);
  return { ok: true };
}

/** Rename a program. */
export async function renameProgramAsAdmin(programId: string, name: string): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };
  const trimmed = name.trim().slice(0, 120);
  if (!trimmed) return { ok: false, error: "Name is empty." };
  const db = createAdminClient();
  const { error } = await db.from("programs").update({ name: trimmed }).eq("id", programId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/program/${programId}`);
  return { ok: true };
}

/**
 * Recalculate a user's program on their behalf (re-runs the generation pipeline
 * via the service-role client, so it works for any owner and skips the per-user
 * rate limit that gates the athlete's own recalculate).
 */
export async function recalcProgramAsAdmin(programId: string): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };
  const db = createAdminClient();
  await db.from("programs").update({ status: "generating", program_data: null }).eq("id", programId);
  try {
    const result = await generateProgram(db, programId);
    revalidatePath(`/admin/program/${programId}`);
    revalidatePath(`/program/${programId}`);
    if (!result.ok) return { ok: false, error: `Generation failed: ${result.issues?.join("; ") ?? "unknown"}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Generation error" };
  }
}

/** Approve or decline a coaching-waitlist application. */
export async function setWaitlistStatus(
  id: string,
  status: "applied" | "approved" | "declined",
): Promise<AdminResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };
  const db = createAdminClient();
  const { error } = await db
    .from("coaching_waitlist")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}
