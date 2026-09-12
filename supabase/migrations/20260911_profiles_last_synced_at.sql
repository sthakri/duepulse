-- ============================================================
-- Migration: profiles.last_synced_at
-- Run in Supabase SQL Editor.
--
-- Why: both dashboard pages showed "Last sync" from
-- profiles.updated_at — which only moves when settings are saved
-- (app/actions.ts) or the profile is created. Syncs (manual, auto,
-- and the 30-min Trigger.dev task) never touched it, so the UI
-- reported "last sync: 3d ago" while data was 10 minutes fresh.
-- Nullable, no default → ADD COLUMN only, no table rewrite.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
