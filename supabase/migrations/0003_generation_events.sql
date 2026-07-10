-- Rate limiting for AI generation (Milestone 7 hardening).
-- One row is logged each time the pipeline actually runs for a user; the
-- /api/generate route counts a user's rows in the trailing 24h to enforce a
-- per-user daily cap. Kept in its own table (not derived from `programs`) so a
-- no-op request never counts and recalculates count independently of creation.

create table if not exists generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  program_id uuid references programs(id) on delete set null,
  created_at timestamptz not null default now()
);

-- The hot path is "count this user's events since a timestamp".
create index if not exists generation_events_user_created_idx
  on generation_events (user_id, created_at desc);

alter table generation_events enable row level security;

-- Users may only see and insert their own events. There is no update/delete
-- policy, so rows are effectively append-only for clients.
create policy "generation_events: own rows" on generation_events
  for select using (auth.uid() = user_id);

create policy "generation_events: insert own" on generation_events
  for insert with check (auth.uid() = user_id);
