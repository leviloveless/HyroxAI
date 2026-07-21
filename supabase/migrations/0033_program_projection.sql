-- 0033: store the projected end-of-program times on the program (#17 projection).
-- Written at generation for HYROX programs; read by the program view's projection
-- card, and updated in place by the (upcoming) mid-program re-forecast.
alter table programs add column if not exists progress_projection jsonb;
