import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Web-push send helper. SERVER ONLY (only imported by /api/push/* + the cron
 * dispatcher).
 *
 * `web-push` is imported dynamically through a variable specifier, and its shape
 * is declared locally (WebPushLike) rather than via `typeof import("web-push")`.
 * That keeps the app type-checking AND building before `npm i web-push` has run
 * and without needing `@types/web-push`. Push is best-effort: if VAPID isn't
 * configured or the package isn't installed, `sendPushToUser` no-ops and returns
 * a zero-sent result instead of throwing.
 *
 * Subscriptions live in `push_subscriptions` (migration 0036). A 404/410 from a
 * push service means the browser subscription is dead, so we prune that row.
 */

export type PushPayload = {
  title: string;
  body: string;
  /** Where notificationclick routes (default /dashboard). */
  url?: string;
  /** Collapse key — a newer notification with the same tag replaces the old. */
  tag?: string;
};

export type PushResult = { sent: number; pruned: number; skipped?: string };

/** Minimal shape of the parts of `web-push` we use — declared locally so this
 * module doesn't depend on the package (or its types) existing at build time. */
type PushSubscriptionShape = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};
type WebPushLike = {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  sendNotification(subscription: PushSubscriptionShape, payload?: string): Promise<unknown>;
};

/** Is web-push configured (keys present)? Cheap gate for callers/UI. */
export function pushConfigured(): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

let cachedWebPush: WebPushLike | null = null;

/** Lazily import + configure web-push. Returns null if unavailable. */
async function getWebPush(): Promise<WebPushLike | null> {
  if (!pushConfigured()) return null;
  if (cachedWebPush) return cachedWebPush;
  let mod: WebPushLike;
  try {
    // Variable specifier so bundlers don't hard-require it at build time.
    const name = "web-push";
    mod = (await import(/* webpackIgnore: true */ name)) as unknown as WebPushLike;
  } catch {
    return null; // not installed yet
  }
  mod.setVapidDetails(
    env.VAPID_SUBJECT || "mailto:support@duravel.app",
    env.VAPID_PUBLIC_KEY!,
    env.VAPID_PRIVATE_KEY!,
  );
  cachedWebPush = mod;
  return mod;
}

type SubRow = {
  id: string;
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
};

/**
 * Send one notification to every web subscription a user has. Best-effort:
 * returns { sent, pruned } and never throws for the common "not configured /
 * not installed" cases. Prunes expired (404/410) endpoints.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<PushResult> {
  const webpush = await getWebPush();
  if (!webpush) return { sent: 0, pruned: 0, skipped: "web-push unavailable" };

  const admin = createAdminClient();
  const { data } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("platform", "web");

  const subs = (data ?? []) as SubRow[];
  if (subs.length === 0) return { sent: 0, pruned: 0 };

  const body = JSON.stringify(payload);
  const dead: string[] = [];
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      if (!s.p256dh || !s.auth) return;
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
        sent += 1;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
      }
    }),
  );

  if (dead.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", dead);
  }

  return { sent, pruned: dead.length };
}
