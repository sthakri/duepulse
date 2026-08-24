"use server";

import { createClient } from "@/lib/supabase/server";
import { timezoneSchema } from "@/lib/validations";

const NUDGE_FREQUENCIES = ["aggressive", "normal", "minimal"] as const;

export async function saveNotificationSettings(
  formData: FormData,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const quietEnabled = formData.get("quiet_hours_enabled") === "on";
  const quietStartRaw = Number(formData.get("quiet_hours_start"));
  const quietEndRaw = Number(formData.get("quiet_hours_end"));
  const quietStart = quietEnabled && Number.isInteger(quietStartRaw) && quietStartRaw >= 0 && quietStartRaw <= 23 ? quietStartRaw : null;
  const quietEnd = quietEnabled && Number.isInteger(quietEndRaw) && quietEndRaw >= 0 && quietEndRaw <= 23 ? quietEndRaw : null;
  if (quietEnabled && (quietStart === null || quietEnd === null)) {
    return { error: "Invalid quiet hours" };
  }

  const nudgeFrequencyRaw = (formData.get("nudge_frequency") as string) || "normal";
  const nudgeFrequency = (NUDGE_FREQUENCIES as readonly string[]).includes(nudgeFrequencyRaw)
    ? nudgeFrequencyRaw
    : "normal";
  const stressThreshold = Math.max(1, Math.min(20, Number(formData.get("stress_threshold")) || 5));

  const timezoneRaw = (formData.get("timezone") as string) || undefined;
  if (timezoneRaw && !timezoneSchema.safeParse(timezoneRaw).success) {
    return { error: "Invalid timezone" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      quiet_hours_start: quietStart,
      quiet_hours_end: quietEnd,
      nudge_frequency: nudgeFrequency,
      stress_threshold: stressThreshold,
      updated_at: new Date().toISOString(),
      ...(timezoneRaw ? { timezone: timezoneRaw } : {}),
    })
    .eq("id", user.id);

  if (error) return { error: "Failed to save settings" };
  return { success: true };
}

export async function pauseNotificationsAction(
  formData: FormData,
): Promise<{ success?: boolean; error?: string; pausedUntil?: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Clamp: no Infinity / absurd far-future pauses (both crash Date or pause forever).
  const hours = Math.min(Math.max(Number(formData.get("hours")) || 0, 0), 720);
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

  if (error) return { error: "Failed to update pause" };
  return { success: true, pausedUntil };
}
