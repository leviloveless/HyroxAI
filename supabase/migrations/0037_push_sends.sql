-- Push-notification dedup ledger (workout reminders — cron/lifecycle).
--
-- One row per notification actually claimed for sending. The lifecycle cron
-- claims a send by inserting its dedup_key with ON CONFLICT DO NOTHING; a
-- successful insert means "we own this send", a conflict means it already fired.
-- This makes the daily cron idempotent — a re-run or a partial run never
-- double-notifies. Mirrors the email_sends idempotency approach.
--
-- dedup_key shapes (lib/push/reminders.ts):
--   workout_due:<userId>:<YYYY-MM-DD>              (once per user per UTC day)
--   week_review:<userId>:<programId>:<weekNumber>  (once per program week)
--
-- RLS is enabled with NO policies, so only the service-role client (the cron
-- dispatcher) can read/write — same pattern as science_leads / email_sends.

create table if not exists public.push_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  dedup_key text not null unique,
  kind text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_sends_user_idx on public.push_sends (user_id);
create index if not exists push_sends_created_at_idx on public.push_sends (created_at desc);

alter table public.push_sends enable row level security;
