-- Science-paper lead capture (email gate for the /science methodology PDF).
--
-- RLS is enabled with NO anon/auth policies, so only the service-role client
-- (createAdminClient, used by app/api/leads/science) can read or write this
-- table — the same pattern the `subscriptions` table uses for the Stripe webhook.

create table if not exists public.science_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'science_pdf',
  sport text,
  created_at timestamptz not null default now()
);

create index if not exists science_leads_email_idx on public.science_leads (email);
create index if not exists science_leads_created_at_idx on public.science_leads (created_at desc);

alter table public.science_leads enable row level security;
