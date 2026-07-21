import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser, pushConfigured } from "@/lib/push/send";

/**
 * POST /api/push/test — send a test notification to the signed-in user's own
 * devices. Lets someone verify the full pipeline (SW registered → subscription
 * stored → server send → notification shown) end-to-end from Settings, with no
 * cron and no other user involved.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!pushConfigured()) {
    return NextResponse.json(
      { error: "Push is not configured on the server." },
      { status: 503 },
    );
  }

  const result = await sendPushToUser(user.id, {
    title: "Duravel",
    body: "Reminders are on — you'll get a nudge when a session is due. 💪",
    url: "/dashboard",
    tag: "duravel-test",
  });

  if (result.sent === 0) {
    return NextResponse.json(
      { ok: false, error: "No active subscriptions for this account.", ...result },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, ...result });
}
