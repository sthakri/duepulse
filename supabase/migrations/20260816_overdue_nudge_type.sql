-- ============================================================
-- Migration: Add 'overdue' nudge type
-- Run in Supabase SQL Editor.
-- Extends nudge_logs.nudge_type CHECK to include 'overdue' for
-- past-due reminder nudges sent once per 24h per assignment.
-- ============================================================

-- Drop the existing CHECK constraint (name was auto-generated; find by definition)
ALTER TABLE public.nudge_logs
  DROP CONSTRAINT IF EXISTS nudge_logs_nudge_type_check;

-- Re-add with the new value
ALTER TABLE public.nudge_logs
  ADD CONSTRAINT nudge_logs_nudge_type_check
  CHECK (nudge_type IN ('productive_window', '12h', '6h', '1h', 'overdue'));
