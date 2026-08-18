-- ============================================================
-- Migration: Add dismissed_at to assignments
-- Run in Supabase SQL Editor.
-- Lets a user manually dismiss an overdue+incomplete assignment
-- so it stays hidden across syncs until Canvas marks it submitted.
-- ============================================================

alter table public.assignments
  add column if not exists dismissed_at timestamptz;

-- Partial index for the hot query path: incomplete, not dismissed.
-- Replaces the existing assignments_user_completed_due index with one
-- that also excludes dismissed rows.
create index if not exists assignments_user_active_due
  on public.assignments (user_id, is_completed, due_at)
  where due_at is not null and dismissed_at is null;
