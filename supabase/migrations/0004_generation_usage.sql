-- Token/cost tracking for AI generation (Milestone 7 follow-up).
-- Each generation_events row is stamped with the tokens the run consumed and an
-- estimated cost, so actual per-generation cost is queryable instead of guessed.
-- Populated by /api/generate after a successful run; null until then (or if the
-- run failed before returning usage).

alter table generation_events
  add column if not exists input_tokens int,
  add column if not exists output_tokens int,
  add column if not exists cost_usd numeric;
