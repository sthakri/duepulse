import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AssignmentCard from "@/components/AssignmentCard";
import SyncNowButton from "@/components/SyncNowButton";
import StressAlert from "@/components/StressAlert";
import WorkloadHeatmap from "@/components/WorkloadHeatmap";
import ProductiveWindowsChart from "@/components/ProductiveWindowsChart";
import BehavioralInsightCard from "@/components/BehavioralInsightCard";
import PushNotificationButton from "@/components/PushNotificationButton";
import TestNotifButton from "@/components/TestNotifButton";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import RefreshButton from "@/components/RefreshButton";
import { analyzeProductiveWindows } from "@/lib/ml";
import { getLocalDate, getLocalHour, getLocalDay } from "@/lib/time";

type CourseJoin = { name: string; color: string } | null;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  async function handleSignOut() {
    "use server";
    const s = await createClient();
    await s.auth.signOut({ scope: "global" });
    redirect("/");
  }

  const userId = user.id;

  const [{ data: assignments }, { data: profile }] = await Promise.all([
    supabase
      .from("assignments")
      .select("*, courses(name, color)")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("profiles")
      .select(
        "canvas_token, canvas_domain, updated_at, timezone, quiet_hours_start, quiet_hours_end, nudge_frequency, stress_threshold, nudge_paused_until",
      )
      .eq("id", userId)
      .single(),
  ]);

  const now = new Date();
  const userTz = profile?.timezone ?? "America/Chicago";
  const hourOfDay = getLocalHour(now, userTz);
  const dayOfWeek = getLocalDay(now, userTz);

  const { data: pwRow } = await supabase
    .from("productive_windows")
    .select("score")
    .eq("user_id", userId)
    .eq("hour_of_day", hourOfDay)
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  const newScore = Math.min(((pwRow?.score as number) ?? 0) + 0.01, 1);

  await supabase.from("productive_windows").upsert(
    {
      user_id: userId,
      hour_of_day: hourOfDay,
      day_of_week: dayOfWeek,
      score: newScore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,hour_of_day,day_of_week" },
  );

  const { data: productiveWindows } = await supabase
    .from("productive_windows")
    .select("hour_of_day, day_of_week, score")
    .eq("user_id", userId);

  const mlInsights = analyzeProductiveWindows(productiveWindows ?? [], userTz);
  const totalDaysTracked = Math.round(
    ((productiveWindows ?? []).reduce((sum, r) => sum + r.score, 0) * 100) / 3,
  );

  const heatmapCounts = (assignments ?? []).reduce<Record<string, number>>(
    (acc, a) => {
      if (!a.due_at) return acc;
      const localDate = getLocalDate(new Date(a.due_at), userTz);
      acc[localDate] = (acc[localDate] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const heatmapData = Object.entries(heatmapCounts).map(
    ([due_at, assignment_count]) => ({
      due_at,
      assignment_count,
    }),
  );

  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const totalCount = (assignments ?? []).length;
  const overdueCount = (assignments ?? []).filter(
    (a) => a.due_at && new Date(a.due_at) < now,
  ).length;
  const dueThisWeekCount = (assignments ?? []).filter(
    (a) =>
      a.due_at &&
      new Date(a.due_at) >= now &&
      new Date(a.due_at) <= weekFromNow,
  ).length;

  const initial = user?.email?.charAt(0).toUpperCase() ?? null;
  const memberSince = user
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
        timeZone: userTz,
      }).format(new Date(user.created_at))
    : null;

  return (
    <div className="bg-slate-900 min-h-screen">
      <header className="border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
          <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            DuePulse
          </span>
          <div className="flex items-center gap-2 sm:gap-4">
            <details className="relative group">
              <summary className="list-none cursor-pointer select-none w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-semibold text-sm hover:bg-indigo-500/30 transition-colors">
                {initial}
              </summary>
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-700">
                  <p className="text-white text-sm font-medium truncate">
                    {user.email}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Member since {memberSince}
                  </p>
                </div>
                <Link
                  href="/dashboard/settings"
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-700/60 text-sm transition-colors"
                >
                  <Settings size={14} />
                  Settings
                </Link>
                <form action={handleSignOut}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-700/60 text-sm transition-colors bg-transparent"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </form>
              </div>
            </details>
            <PushNotificationButton userId={userId} />
            {process.env.NODE_ENV === "development" && (
              <TestNotifButton userId={userId} />
            )}
            {profile?.canvas_token && profile?.canvas_domain && (
              <SyncNowButton userId={userId} />
            )}
            <RefreshButton />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="order-1 lg:order-0 lg:col-span-2 lg:col-start-1 lg:row-start-1 min-h-0 self-start">
            <StressAlert userId={userId} />
            <WorkloadHeatmap data={heatmapData} userTz={userTz} />
          </div>

          <div className="order-2 lg:hidden rounded-xl bg-slate-800 p-6">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-6">
              Overview
            </p>
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-3xl font-bold text-white">{totalCount}</p>
                <p className="text-slate-400 text-sm mt-1">Total assignments</p>
              </div>
              <div className="h-px bg-slate-700/50" />
              <div>
                <p className="text-3xl font-bold text-red-400">
                  {overdueCount}
                </p>
                <p className="text-slate-400 text-sm mt-1">Overdue</p>
              </div>
              <div className="h-px bg-slate-700/50" />
              <div>
                <p className="text-3xl font-bold text-amber-400">
                  {dueThisWeekCount}
                </p>
                <p className="text-slate-400 text-sm mt-1">Due this week</p>
              </div>
            </div>
          </div>

          <div className="order-4 lg:hidden">
            <ProductiveWindowsChart
              data={productiveWindows ?? []}
              userTz={userTz}
            />
          </div>

          <div className="order-5 lg:hidden">
            <BehavioralInsightCard
              insights={mlInsights}
              totalDaysTracked={totalDaysTracked}
            />
          </div>

          <div className="hidden lg:block lg:self-start lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-2">
            <div className="rounded-xl bg-slate-800 p-6 mb-6">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-6">
                Overview
              </p>
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-3xl font-bold text-white">{totalCount}</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Total assignments
                  </p>
                </div>
                <div className="h-px bg-slate-700/50" />
                <div>
                  <p className="text-3xl font-bold text-red-400">
                    {overdueCount}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">Overdue</p>
                </div>
                <div className="h-px bg-slate-700/50" />
                <div>
                  <p className="text-3xl font-bold text-amber-400">
                    {dueThisWeekCount}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">Due this week</p>
                </div>
              </div>
            </div>
            <ProductiveWindowsChart
              data={productiveWindows ?? []}
              userTz={userTz}
            />
            <div className="mt-6">
              <BehavioralInsightCard
                insights={mlInsights}
                totalDaysTracked={totalDaysTracked}
              />
            </div>
          </div>

          <div className="order-3 lg:order-0 lg:col-span-2 lg:col-start-1 lg:row-start-2 flex flex-col gap-3">
            {(assignments ?? []).map((a) => {
              const course = a.courses as CourseJoin;
              return (
                <AssignmentCard
                  key={a.id}
                  title={a.title}
                  course_name={course?.name ?? "Unknown"}
                  due_at={a.due_at}
                  points_possible={
                    a.points_possible !== null
                      ? Number(a.points_possible)
                      : null
                  }
                  canvas_assignment_id={String(a.canvas_assignment_id)}
                  course_color={course?.color}
                  userTz={userTz}
                />
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
