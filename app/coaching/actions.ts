"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, EMAIL_FROM } from "@/lib/email/resend";
import { env } from "@/lib/env";
import { parseAdminEmails } from "@/lib/admin";

/**
 * Coaching waitlist submission (#16). No payment — an application Levi approves
 * manually. Inserts via the service-role client (the table is service-role only)
 * and best-effort emails the first ADMIN_EMAILS address so Levi sees new
 * applications. Works logged-in (links the user) or logged-out.
 */

export type WaitlistResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitWaitlist(input: {
  name: string;
  email: string;
  sportGoal?: string;
  currentTraining?: string;
  why?: string;
}): Promise<WaitlistResult> {
  const name = (input.name ?? "").trim().slice(0, 120);
  const email = (input.email ?? "").trim().slice(0, 200);
  if (!name) return { ok: false, error: "Please enter your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email." };

  const sportGoal = (input.sportGoal ?? "").trim().slice(0, 200) || null;
  const currentTraining = (input.currentTraining ?? "").trim().slice(0, 1000) || null;
  const why = (input.why ?? "").trim().slice(0, 2000) || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = createAdminClient();
  const { error } = await db.from("coaching_waitlist").insert({
    user_id: user?.id ?? null,
    name,
    email,
    sport_goal: sportGoal,
    current_training: currentTraining,
    why,
  });
  if (error) return { ok: false, error: "Couldn't submit — please try again." };

  // Best-effort admin notification (never blocks the submission).
  try {
    const to = parseAdminEmails(env.ADMIN_EMAILS)[0];
    if (resend && to) {
      await resend.emails.send({
        from: EMAIL_FROM,
        to,
        subject: `New 1-on-1 coaching application — ${name}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Sport / goal: ${sportGoal ?? "—"}`,
          `Current training: ${currentTraining ?? "—"}`,
          `Why coaching: ${why ?? "—"}`,
          user ? `Signed-in user id: ${user.id}` : `(not signed in)`,
          ``,
          `Review in the admin console → Coaching waitlist.`,
        ].join("\n"),
      });
    }
  } catch {
    /* notification is best-effort */
  }

  return { ok: true };
}
