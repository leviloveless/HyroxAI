-- Add a user-facing name to programs (Tasks addition #5).
-- Run this in the Supabase SQL editor (migrations are applied manually).

alter table programs add column if not exists name text;

-- Backfill any existing rows with a sensible default.
update programs
set name = duration_weeks || '-week ' || replace(program_type, '_', ' ') || ' program'
where name is null;
