-- ============================================================
-- Migration: Add missing RLS policies
-- Run in Supabase SQL Editor before production launch.
-- ============================================================

-- push_subscriptions: add owner update policy (required for upsert)
CREATE POLICY "push_subscriptions: owner update"
  ON public.push_subscriptions FOR update
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- nudge_logs: add owner insert policy
CREATE POLICY "nudge_logs: owner insert"
  ON public.nudge_logs FOR insert
  WITH CHECK (auth.uid() = user_id);

-- nudge_logs: add owner update policy
CREATE POLICY "nudge_logs: owner update"
  ON public.nudge_logs FOR update
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- nudge_logs: add owner delete policy
CREATE POLICY "nudge_logs: owner delete"
  ON public.nudge_logs FOR delete
  USING (auth.uid() = user_id);
