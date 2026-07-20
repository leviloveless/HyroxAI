import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/**
 * Admin access control (#15) — an ENV ALLOWLIST, no DB flag. `ADMIN_EMAILS` is a
 * comma/space-separated list of emails; a signed-in user whose auth email is on
 * it is an admin. Admin surfaces read/write other users' data via the
 * service-role client (which bypasses RLS), so every admin route MUST gate on
 * `getAdmin()` first. Parsing is pure + tested; the env + session reads live here.
 */

/** Parse the ADMIN_EMAILS env value into a normalized lowercase list. */
export function parseAdminEmails(raw: string | null | undefined): string[] {
  return (raw ?? "")
    .split(/[,\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Is `email` present in the given allowlist string? (Pure — for tests.) */
export function emailIsAdmin(raw: string | null | undefined, email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails(raw).includes(email.trim().toLowerCase());
}

/** Is `email` an admin per the configured ADMIN_EMAILS? */
export function isAdminEmail(email: string | null | undefined): boolean {
  return emailIsAdmin(env.ADMIN_EMAILS, email);
}

/**
 * The signed-in admin, or null if not signed in / not on the allowlist. Call at
 * the top of every admin route and redirect/404 on null BEFORE any service-role
 * read or write.
 */
export async function getAdmin(): Promise<{ userId: string; email: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) return null;
  return { userId: user.id, email: user.email };
}
