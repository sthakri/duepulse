-- ============================================================
-- Migration: nudge_events — append-only nudge send history.
-- Run in Supabase SQL Editor.
--
-- Why: nudge_logs is a CLAIM/dedup table — exactly one upserted
-- row per (user_id, assignment_id, nudge_type) whose sent_at
-- refreshes on every re-send. The Insights "Nudge Summary" counted
-- those rows as "notifications sent", which was wrong three ways:
--   1. An overdue assignment nagged daily for 30 days counted ONCE.
--   2. sent_at keeps refreshing, so old claims never age out of the
--      "last 30 days" window.
--   3. Completing an assignment cascade-deleted its rows, erasing
--      history retroactively.
-- This table records one row per actually-delivered nudge. The
-- dedup claim flow is unchanged — nudge_logs stays as-is.
-- ============================================================

create table if not exists public.nudge_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  nudge_type  text not null check (nudge_type in ('productive_window', '12h', '6h', '1h', 'overdue', 'token_expired')),
  sent_at     timestamptz not null default now()
);

create index if not exists nudge_events_user_time
  on public.nudge_events (user_id, sent_at desc);

alter table public.nudge_events enable row level security;

-- Reads happen via the owner's session (Insights page). Writes go
-- through the service role (nudge-engine, canvas-sync), which
-- bypasses RLS — no insert/update/delete policies needed.
create policy "nudge_events: owner select"
  on public.nudge_events for select
  using (auth.uid() = user_id);
