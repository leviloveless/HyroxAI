import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/push/unsubscribe — remove a browser's PushSubscription for the
 * signed-in user. Called when the user turns reminders off. RLS scopes the
 * delete to the caller's own rows; deleting a non-existent endpoint is a no-op.
 */

const UnsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UnsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", parsed.data.endpoint);

  if (error) {
    console.error("[push/unsubscribe] delete failed:", error.message);
    return NextResponse.json({ error: "Could not remove subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
