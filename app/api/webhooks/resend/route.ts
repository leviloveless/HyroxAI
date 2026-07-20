import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { verifySvix } from "@/lib/email/svix";
import { nextStatus } from "@/lib/email/webhook-status";
import type { EmailStatus } from "@/lib/email/types";

/**
 * POST /api/webhooks/resend — Resend delivery/engagement + suppression sink (07 go-live).
 *
 * Verifies the Svix signature over the RAW body, then advances the matching email_sends
 * row (by resend_id) FORWARD ONLY via nextStatus(), so out-of-order events never regress
 * a terminal/engaged status. Hard bounces and complaints are added to email_suppressions
 * (keyed by email) so they are blocked before every future send, including transactional.
 *
 * Always ACKs handled AND unhandled types with 200 so Resend stops retrying. 503 when the
 * secret is unset; 400 on a bad/missing signature.
 */
export const dynamic = "force-dynamic";

interface ResendEvent {
  type?: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    bounce?: { type?: string; subType?: string } | null;
  };
}

export async function POST(request: Request) {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  }

  // RAW body — must be the exact bytes Resend signed.
  const payload = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "missing_signature_headers" }, { status: 400 });
  }
  const valid = verifySvix({
    payload,
    headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
    secret,
  });
  if (!valid) return NextResponse.json({ error: "invalid_signature" }, { status: 400 });

  let event: ResendEvent;
  try {
    event = JSON.parse(payload) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const type = event.type ?? "";
  const emailId = event.data?.email_id ?? null;
  if (!type || !emailId) {
    // Nothing actionable — still ACK so Resend stops retrying.
    return NextResponse.json({ received: true, handled: false });
  }

  const admin = createAdminClient();
  await advanceStatus(admin, emailId, type);

  if (type === "email.complained" || (type === "email.bounced" && isHardBounce(event.data))) {
    await suppress(admin, event, type);
  }

  return NextResponse.json({ received: true, handled: true });
}

/** Advance the ledger row FORWARD ONLY; no-op if the row is missing or would regress. */
async function advanceStatus(
  admin: SupabaseClient,
  resendId: string,
  type: string,
): Promise<void> {
  const { data } = await admin
    .from("email_sends")
    .select("id, status")
    .eq("resend_id", resendId)
    .maybeSingle();
  const row = (data as { id: string; status: EmailStatus } | null) ?? null;
  if (!row) return; // provider event for a message we didn't record — ignore.

  const next = nextStatus(row.status, type);
  if (!next) return; // unknown event, duplicate, or would regress.

  await admin
    .from("email_sends")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", row.id);
}

/** Resend marks transient/soft bounces; treat everything else (incl. unknown) as hard. */
function isHardBounce(data: ResendEvent["data"]): boolean {
  const t = (data?.bounce?.type ?? "").toLowerCase();
  if (t.includes("transient") || t.includes("soft")) return false;
  return true;
}

async function suppress(admin: SupabaseClient, event: ResendEvent, type: string): Promise<void> {
  const email = firstRecipient(event.data?.to);
  if (!email) return;
  const reason = type === "email.complained" ? "complaint" : "hard_bounce";
  await admin.from("email_suppressions").upsert(
    {
      email,
      reason,
      resend_id: event.data?.email_id ?? null,
      created_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );
}

function firstRecipient(to: string | string[] | undefined): string | null {
  if (!to) return null;
  const value = Array.isArray(to) ? to[0] : to;
  return value && value.length > 0 ? value : null;
}
