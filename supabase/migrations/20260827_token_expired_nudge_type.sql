-- ============================================================
-- Migration: Add 'token_expired' nudge type
-- Run in Supabase SQL Editor.
-- Extends nudge_logs.nudge_type CHECK to include 'token_expired' for
-- the scheduled canvas-sync task: when a user's Canvas token dies
-- (Canvas 401 or decrypt failure), one push per 72h tells them to
-- reconnect — without it, nudges stop silently until they happen to
-- open the app.
-- ============================================================

-- Drop the existing CHECK constraint
ALTER TABLE public.nudge_logs
  DROP CONSTRAINT IF EXISTS nudge_logs_nudge_type_check;

-- Re-add with the new value
ALTER TABLE public.nudge_logs
  ADD CONSTRAINT nudge_logs_nudge_type_check
  CHECK (nudge_type IN ('productive_window', '12h', '6h', '1h', 'overdue', 'token_expired'));
