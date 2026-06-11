import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("quiet_hours_start, quiet_hours_end, nudge_frequency, stress_threshold, nudge_paused_until, timezone")
    .eq("id", user.id)
    .single();

  async function saveSettings(formData: FormData) {
    "use server";

    const quietEnabled = formData.get("quiet_hours_enabled") === "on";
    const quietStart = quietEnabled
      ? parseInt(formData.get("quiet_hours_start") as string, 10)
      : null;
    const quietEnd = quietEnabled
      ? parseInt(formData.get("quiet_hours_end") as string, 10)
      : null;
    const frequency = formData.get("nudge_frequency") as string;
    const threshold = parseInt(formData.get("stress_threshold") as string, 10);

    if (quietEnabled && (isNaN(quietStart!) || isNaN(quietEnd!))) {
      return { error: "Invalid quiet hours" };
    }
    if (!["aggressive", "normal", "minimal"].includes(frequency)) {
      return { error: "Invalid nudge frequency" };
    }
    if (isNaN(threshold) || threshold < 1 || threshold > 20) {
      return { error: "Stress threshold must be 1–20" };
    }

    const s = await createClient();
    const {
      data: { user: currentUser },
    } = await s.auth.getUser();
    if (!currentUser) return { error: "Not authenticated" };

    const { error } = await s
      .from("profiles")
      .update({
        quiet_hours_start: quietStart,
        quiet_hours_end: quietEnd,
        nudge_frequency: frequency,
        stress_threshold: threshold,
        updated_at: new Date().toISOString(),
      })
      .eq("id", currentUser.id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/settings");
    return { success: true };
  }

  async function pauseNotifications(formData: FormData) {
    "use server";

    const hours = parseInt(formData.get("hours") as string, 10);

    let nudgePausedUntil: string | null = null;
    if (hours > 0) {
      nudgePausedUntil = new Date(
        Date.now() + hours * 60 * 60 * 1000,
      ).toISOString();
    }

    const s = await createClient();
    const {
      data: { user: currentUser },
    } = await s.auth.getUser();
    if (!currentUser) return { error: "Not authenticated" };

    const { error } = await s
      .from("profiles")
      .update({ nudge_paused_until: nudgePausedUntil })
      .eq("id", currentUser.id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/settings");
    return { success: true, pausedUntil: nudgePausedUntil };
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6">
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5m7-7-7 7 7 7" />
          </svg>
          Back to dashboard
        </a>

        <h1 className="text-2xl font-bold text-white mb-8">Notification Settings</h1>

        <SettingsForm
          saveSettings={saveSettings}
          pauseNotifications={pauseNotifications}
          initialQuietStart={profile?.quiet_hours_start ?? null}
          initialQuietEnd={profile?.quiet_hours_end ?? null}
          initialFrequency={profile?.nudge_frequency ?? "normal"}
          initialThreshold={profile?.stress_threshold ?? 5}
          initialPausedUntil={profile?.nudge_paused_until ?? null}
        />
      </div>
    </div>
  );
}
