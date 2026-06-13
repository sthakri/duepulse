import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SyncNowButton from "@/components/SyncNowButton";
import WorkloadHeatmap from "@/components/WorkloadHeatmap";
import PushNotificationButton from "@/components/PushNotificationButton";
import MobileInstallGuide from "@/components/MobileInstallGuide";
import { getLocalDate, getLocalHour, getLocalDay } from "@/lib/time";
import { BookOpen, AlertTriangle, CalendarClock, RefreshCw } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userId = user.id;
  const [{ data: assignments }, { data: profile }] = await Promise.all([
    supabase.from("assignments").select("due_at").eq("user_id", userId).eq("is_completed", false),
    supabase.from("profiles").select("canvas_token, canvas_domain, timezone, updated_at").eq("id", userId).single(),
  ]);

  const now = new Date();
  const userTz = profile?.timezone ?? "America/Chicago";

  // Track productive window
  const hourOfDay = getLocalHour(now, userTz);
  const dayOfWeek = getLocalDay(now, userTz);
  const { data: pwRow } = await supabase.from("productive_windows").select("score").eq("user_id", userId).eq("hour_of_day", hourOfDay).eq("day_of_week", dayOfWeek).maybeSingle();
  const newScore = Math.min(((pwRow?.score as number) ?? 0) + 0.01, 1);
  await supabase.from("productive_windows").upsert({ user_id: userId, hour_of_day: hourOfDay, day_of_week: dayOfWeek, score: newScore, updated_at: new Date().toISOString() }, { onConflict: "user_id,hour_of_day,day_of_week" });

  // Heatmap data
  const heatmapCounts = (assignments ?? []).reduce<Record<string, number>>((acc, a) => {
    if (!a.due_at) return acc;
    const d = getLocalDate(new Date(a.due_at), userTz);
    acc[d] = (acc[d] ?? 0) + 1;
    return acc;
  }, {});
  const heatmapData = Object.entries(heatmapCounts).map(([due_at, assignment_count]) => ({ due_at, assignment_count }));

  // Stats
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const totalCount = (assignments ?? []).length;
  const overdueCount = (assignments ?? []).filter((a) => a.due_at && new Date(a.due_at) < now).length;
  const dueThisWeekCount = (assignments ?? []).filter((a) => a.due_at && new Date(a.due_at) >= now && new Date(a.due_at) <= weekFromNow).length;
  const hasCanvas = !!(profile?.canvas_token && profile?.canvas_domain);

  const lastSynced = profile?.updated_at ? (() => {
    const diff = Math.floor((now.getTime() - new Date(profile.updated_at).getTime()) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })() : null;

  return (
    <>
      <header className="border-b border-[#334155]/70 bg-[#0F172A] sticky top-0 z-30 h-[57px]">
        <div className="pl-14 lg:pl-0 px-5 h-full flex items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            {lastSynced && (
              <span className="hidden sm:flex items-center gap-1.5 text-[#64748B] text-xs">
                <RefreshCw size={11} />
                Last sync: {lastSynced}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <PushNotificationButton userId={userId} />
            {hasCanvas && <SyncNowButton userId={userId} />}
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 py-6 sm:px-6 sm:py-7 max-w-7xl w-full mx-auto">
        <MobileInstallGuide />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {/* Heatmap */}
          <div className="xl:col-span-2">
            <WorkloadHeatmap data={heatmapData} userTz={userTz} />
          </div>

          {/* Stats */}
          <div className="xl:col-span-1 flex flex-col gap-4">
            <div className="rounded-[18px] bg-[#1E293B]/80 border border-[#334155]/70 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
              <p className="text-[#64748B] text-xs font-semibold uppercase tracking-widest mb-6">Overview</p>
              <div className="flex flex-col gap-5">
                <Link href="/dashboard/assignments" className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-[#243044] border border-[#334155] flex items-center justify-center shrink-0">
                    <BookOpen size={17} className="text-[#94A3B8]" />
                  </div>
                  <div>
                    <p className="text-[#F8FAFC] font-bold text-3xl leading-none group-hover:text-[#818CF8] transition-colors">{totalCount}</p>
                    <p className="text-[#64748B] text-sm mt-1">Total assignments</p>
                  </div>
                </Link>
                <div className="h-px bg-[#334155]/70" />
                <Link href="/dashboard/assignments?filter=overdue" className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center shrink-0">
                    <AlertTriangle size={17} className="text-[#EF4444]" />
                  </div>
                  <div>
                    <p className="text-[#EF4444] font-bold text-3xl leading-none">{overdueCount}</p>
                    <p className="text-[#64748B] text-sm mt-1">Overdue</p>
                  </div>
                </Link>
                <div className="h-px bg-[#334155]/70" />
                <Link href="/dashboard/assignments?filter=upcoming" className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center shrink-0">
                    <CalendarClock size={17} className="text-[#F59E0B]" />
                  </div>
                  <div>
                    <p className="text-[#F59E0B] font-bold text-3xl leading-none">{dueThisWeekCount}</p>
                    <p className="text-[#64748B] text-sm mt-1">Due this week</p>
                  </div>
                </Link>
              </div>
            </div>

            <Link href="/dashboard/insights" className="rounded-[18px] bg-[#1E293B]/80 border border-[#334155]/70 p-5 flex items-center justify-between group hover:border-[#6366F1]/40 hover:bg-[#243044]/80 transition-all">
              <div>
                <p className="text-[#F8FAFC] font-semibold text-sm">Your Focus Insights</p>
                <p className="text-[#64748B] text-xs mt-0.5">See your productive patterns</p>
              </div>
              <span className="text-[#818CF8] text-lg group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
