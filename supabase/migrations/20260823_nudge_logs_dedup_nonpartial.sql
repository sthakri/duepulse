-- ============================================================
-- Migration: nudge_logs_dedup — replace partial unique index with
-- non-partial unique index.
-- Run in Supabase SQL Editor.
--
-- Why: PostgREST upserts cannot use a partial unique index as an
-- ON CONFLICT arbiter (error 42P10: "no unique or exclusion
-- constraint matching"), so every nudge_logs upsert failed —
-- overdue nudges were resent every run. Rows with NULL
-- assignment_id (productive_window logs) stay unrestricted:
-- Postgres treats NULLs as distinct in unique indexes.
-- ============================================================

DROP INDEX IF EXISTS public.nudge_logs_dedup;

CREATE UNIQUE INDEX nudge_logs_dedup
  ON public.nudge_logs (user_id, assignment_id, nudge_type);
