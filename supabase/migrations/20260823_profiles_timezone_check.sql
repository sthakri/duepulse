-- ============================================================
-- Migration: profiles.timezone shape CHECK
-- Run in Supabase SQL Editor.
--
-- Why: RLS lets any authenticated user write their own profile row
-- directly (bypassing server-action validation). A malformed
-- timezone crashes every Intl.DateTimeFormat consumer — including
-- the nudge engine for ALL users. This CHECK blocks garbage shapes
-- at the DB layer (IANA-shape regex; full IANA validity is enforced
-- in app code via Intl). Applied to prod 2026-08-23.
-- ============================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_timezone_shape;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_timezone_shape
  CHECK (timezone IS NULL OR timezone ~ '^[A-Za-z][A-Za-z0-9_+\-/]{1,63}$');
