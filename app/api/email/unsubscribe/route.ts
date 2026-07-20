import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { verifyUnsubToken, type UnsubToken } from "@/lib/email/unsubscribe";

/**
 * /api/email/unsubscribe — session-less, HMAC-token unsubscribe (07 §4.2, RFC 8058).
 *
 *   POST → RFC 8058 one-click (List-Unsubscribe-Post). 200 {ok:true}. source 'one_click'.
 *   GET  → footer-link fallback. Branded HTML confirmation page. source 'footer_link'.
 *
 * No auth: the signed token IS the authorization. The effect is applied idempotently via
 * the service-role client (email_preferences is upserted; email_unsubscribe_events is
 * appended — that table has no auth-role insert policy, so writes must be service-role).
 */
export const dynamic = "force-dynamic";

const APP_URL = env.NEXT_PUBLIC_SITE_URL ?? "https://duravel.app";
const MANAGE_URL = `${APP_URL}/settings/email`;

/** Suppressible preference columns. Any other category slug updates no column (safety). */
const SUPPRESSIBLE = new Set([
  "onboarding",
  "weekly_summary",
  "race",
  "milestone",
  "winback",
  "engagement",
  "product",
]);

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: "onboarding emails",
  weekly_summary: "weekly summary emails",
  race: "race reminders",
  milestone: "milestone emails",
  winback: "win-back emails",
  engagement: "engagement emails",
  product: "product updates",
};

function labelFor(category: string | null): string {
  if (category === null) return "all Duravel lifecycle emails";
  return CATEGORY_LABELS[category] ?? "these emails";
}

export async function GET(request: Request) {
  const token = readTokenFromQuery(request);
  const parsed = token ? verifyUnsubToken(token, env.EMAIL_UNSUB_SECRET ?? "") : null;
  if (!parsed) return htmlResponse(errorPage(), 400);

  await applyUnsubscribe(createAdminClient(), parsed, "footer_link");
  return htmlResponse(successPage(labelFor(parsed.category)), 200);
}

export async function POST(request: Request) {
  const token = await readTokenFromRequest(request);
  const parsed = token ? verifyUnsubToken(token, env.EMAIL_UNSUB_SECRET ?? "") : null;
  if (!parsed) return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });

  await applyUnsubscribe(createAdminClient(), parsed, "one_click");
  return NextResponse.json({ ok: true });
}

/** Idempotent: flip the preference column (or global) + append an audit event. */
async function applyUnsubscribe(
  admin: SupabaseClient,
  token: UnsubToken,
  source: "one_click" | "footer_link",
): Promise<void> {
  const now = new Date().toISOString();
  if (token.category === null) {
    await admin
      .from("email_preferences")
      .upsert({ user_id: token.userId, unsubscribed_all: true, updated_at: now }, {
        onConflict: "user_id",
      });
  } else if (SUPPRESSIBLE.has(token.category)) {
    await admin
      .from("email_preferences")
      .upsert({ user_id: token.userId, [token.category]: false, updated_at: now }, {
        onConflict: "user_id",
      });
  }
  await admin.from("email_unsubscribe_events").insert({
    user_id: token.userId,
    category: token.category,
    source,
  });
}

function readTokenFromQuery(request: Request): string | null {
  return new URL(request.url).searchParams.get("token");
}

async function readTokenFromRequest(request: Request): Promise<string | null> {
  // One-click puts the token in the URL; also accept a form field for robustness.
  const fromQuery = readTokenFromQuery(request);
  if (fromQuery) return fromQuery;
  try {
    const form = await request.formData();
    const v = form.get("token");
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

function htmlResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function page(inner: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>Duravel — Email preferences</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; background:#fafafa; color:#18181b;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { max-width:440px; width:100%; background:#fff; border:1px solid #e4e4e7;
    border-radius:16px; padding:32px; text-align:center; }
  .brand { font-weight:700; letter-spacing:-0.02em; font-size:18px; margin-bottom:20px; }
  h1 { font-size:20px; margin:0 0 8px; letter-spacing:-0.01em; }
  p { color:#52525b; font-size:14px; line-height:1.5; margin:0 0 20px; }
  a.btn { display:inline-block; background:#000; color:#fff; text-decoration:none;
    padding:10px 20px; border-radius:9999px; font-size:14px; }
</style></head>
<body><div class="wrap"><div class="card">
  <div class="brand">Duravel</div>
  ${inner}
</div></div></body></html>`;
}

function successPage(label: string): string {
  return page(
    `<h1>You've been unsubscribed</h1>
     <p>You'll no longer receive ${escapeHtml(label)}. Billing and receipt emails are always sent.</p>
     <a class="btn" href="${MANAGE_URL}">Manage all preferences</a>`,
  );
}

function errorPage(): string {
  return page(
    `<h1>This link is invalid or expired</h1>
     <p>We couldn't verify this unsubscribe link. You can manage every email preference from your account instead.</p>
     <a class="btn" href="${MANAGE_URL}">Manage all preferences</a>`,
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
