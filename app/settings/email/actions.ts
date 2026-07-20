"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Save email preferences (pref center). The email_preferences upsert goes through the
 * RLS-scoped user client (own row only). The email_unsubscribe_events audit rows have no
 * auth-role insert policy (service-role writes only), so those go through the admin
 * client — one row per category the user turns OFF this save (source 'pref_center').
 */
const CATEGORIES = [
  "onboarding",
  "weekly_summary",
  "race",
  "milestone",
  "winback",
  "engagement",
  "product",
] as const;

type PrefRow = Record<string, boolean>;

export async function updateEmailPreferences(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Prior state (for on→off audit). Absent row → defaults all-on.
  const { data: currentData } = await supabase
    .from("email_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const prev = (currentData as PrefRow | null) ?? null;
  const wasOn = (key: string): boolean => (prev ? prev[key] !== false : true);
  const wasUnsubbedAll = prev ? (prev as Record<string, unknown>).unsubscribed_all === true : false;

  const unsubscribedAll = formData.has("unsubscribed_all");
  const next: Record<string, unknown> = {
    user_id: user.id,
    unsubscribed_all: unsubscribedAll,
    updated_at: new Date().toISOString(),
  };
  for (const c of CATEGORIES) next[c] = formData.has(c);

  await supabase.from("email_preferences").upsert(next, { onConflict: "user_id" });

  // Audit each opt-out (service-role — the events table has no auth insert policy).
  const events: { user_id: string; category: string | null; source: "pref_center" }[] = [];
  for (const c of CATEGORIES) {
    if (wasOn(c) && !formData.has(c)) {
      events.push({ user_id: user.id, category: c, source: "pref_center" });
    }
  }
  if (!wasUnsubbedAll && unsubscribedAll) {
    events.push({ user_id: user.id, category: null, source: "pref_center" });
  }
  if (events.length > 0) {
    await createAdminClient().from("email_unsubscribe_events").insert(events);
  }

  revalidatePath("/settings/email");
}
