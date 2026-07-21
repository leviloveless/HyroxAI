-- Web Push (and future native APNs) subscription store.
--
-- One row per (user, endpoint). The web-push subscribe route inserts the
-- browser's PushSubscription (endpoint + p256dh + auth keys); the send helper
-- (lib/push/send.ts) reads a user's rows to fan out notifications and prunes
-- rows on a 404/410 (expired endpoint). `platform` is 'web' today; native iOS
-- APNs device tokens will land here as 'ios' once the Capacitor shell ships,
-- so one table + one send path serves both channels.
--
-- RLS: each user owns their rows (mirrors workout_logs). The service-role
-- client (createAdminClient, used by the cron/lifecycle dispatcher) bypasses
-- RLS to read every subscriber when sending.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  platform text not null default 'web' check (platform in ('web', 'ios')),
  endpoint text not null,
  p256dh text,
  auth text,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- Hot path: "all subscriptions for this user" (send fan-out).
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: select own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "push_subscriptions: insert own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "push_subscriptions: delete own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
