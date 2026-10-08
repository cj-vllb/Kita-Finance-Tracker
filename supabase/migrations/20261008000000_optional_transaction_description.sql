-- TrackMyKita Part 1: a transaction description is now optional.
--
-- Additive and non-destructive: it only RELAXES one constraint. No rows are touched, no column or table
-- is dropped, RLS and policies are unchanged.
--
-- The existing CHECK (length(trim(description)) > 0) is intentionally kept. A CHECK passes when its
-- expression is NULL, so a missing description (NULL) is accepted while an empty or whitespace-only
-- string is still rejected. The app stores "no description" as NULL, never as a placeholder like 'None'.
--
-- Apply BEFORE deploying the new frontend:  supabase db push
alter table public.transactions alter column description drop not null;

-- transactions.category_id was already nullable (and the composite foreign keys use the default
-- MATCH SIMPLE, which skips the check when category_id is NULL), so "no category" needs no change.
