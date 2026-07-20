import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { sendEmail, type SendResult } from "../send";
import type { WelcomeProps } from "../templates/types";

/**
 * Welcome flow (07 §2.1 #1). Resolves the user's first name + trial end, builds
 * WelcomeProps, and routes a once-ever `welcome` send through sendEmail. Service tier —
 * always sent when EMAIL_ENABLED (no preference/frequency gate) — and idempotent on the
 * `welcome:<userId>` dedup key, so calling it on every confirmation is safe.
 *
 * Called non-blocking from /auth/confirm via Next's after(), so it never delays or breaks
 * the confirmation redirect. Uses the service-role admin client (session-less context).
 */
const TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function sendWelcome(admin: SupabaseClient, userId: string): Promise<SendResult> {
  const appUrl = env.NEXT_PUBLIC_SITE_URL ?? "https://duravel.app";

  const { data } = await admin
    .from("profiles")
    .select("first_name, trial_started_at")
    .eq("id", userId)
    .maybeSingle();
  const row = (data as { first_name: string | null; trial_started_at: string | null } | null) ?? null;

  const props: WelcomeProps = {
    firstName: row?.first_name ?? "there",
    generateUrl: `${appUrl}/onboarding`,
    trialEndDate: formatTrialEnd(row?.trial_started_at ?? null),
    manageUrl: `${appUrl}/settings/email`,
  };

  return sendEmail({
    userId,
    template: "welcome",
    dedup: { template: "welcome", userId },
    render: { template: "welcome", props },
    meta: { flow: "welcome" },
  });
}

/** Pre-format the trial end for the template, e.g. "Jul 31". Falls back to now+14d. */
function formatTrialEnd(startedAt: string | null): string {
  const base = startedAt ? Date.parse(startedAt) : Date.now();
  const endMs = (Number.isNaN(base) ? Date.now() : base) + TRIAL_DAYS * DAY_MS;
  return new Date(endMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
