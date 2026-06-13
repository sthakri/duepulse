"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveNotificationSettings(
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const quietEnabled = formData.get("quiet_hours_enabled") === "on";
  const quietStart = quietEnabled ? Number(formData.get("quiet_hours_start")) : null;
  const quietEnd = quietEnabled ? Number(formData.get("quiet_hours_end")) : null;
  const nudgeFrequency = (formData.get("nudge_frequency") as string) || "normal";
  const stressThreshold = Math.max(1, Math.min(20, Number(formData.get("stress_threshold")) || 5));

  const { error } = await supabase
    .from("profiles")
    .update({
      quiet_hours_start: quietStart,
      quiet_hours_end: quietEnd,
      nudge_frequency: nudgeFrequency,
      stress_threshold: stressThreshold,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function pauseNotificationsAction(
  formData: FormData,
): Promise<{ success?: boolean; error?: string; pausedUntil?: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const hours = Number(formData.get("hours") ?? 0);
  const pausedUntil =
    hours > 0
      ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      nudge_paused_until: pausedUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true, pausedUntil };
}
