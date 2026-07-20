-- Coaching (#15/#16): admin coaching notes on a program (visible to the athlete)
-- + the $350 1-on-1 coaching WAITLIST (manual approval, no instant payment).
--
-- Admin access is an env allowlist (ADMIN_EMAILS), enforced in app code; admin
-- reads/writes go through the service-role client. These tables therefore expose
-- only the minimal athlete-facing RLS (read your own coaching notes) and keep all
-- admin/waitlist writes service-role only.

-- --- Coaching notes: an admin/coach leaves notes on a specific program ---------
create table if not exists coaching_notes (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade, -- program owner (drives read RLS)
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists coaching_notes_program_idx on coaching_notes (program_id, created_at desc);

alter table coaching_notes enable row level security;
-- The athlete may READ notes on their own program; only the service-role admin writes.
create policy "coaching_notes: read own" on coaching_notes
  for select using (auth.uid() = user_id);

-- --- Coaching waitlist: applications for 1-on-1 coaching ($350/mo) -------------
create table if not exists coaching_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null, -- nullable: applicant may be logged out
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  sport_goal text check (sport_goal is null or char_length(sport_goal) <= 200),
  current_training text check (current_training is null or char_length(current_training) <= 1000),
  why text check (why is null or char_length(why) <= 2000),
  status text not null default 'applied' check (status in ('applied', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists coaching_waitlist_status_idx on coaching_waitlist (status, created_at desc);

alter table coaching_waitlist enable row level security;
-- No policies on purpose: the /coaching form inserts and the admin console reads /
-- updates status entirely through the service-role server actions.
