import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AssignmentCard from "@/components/AssignmentCard";
import SyncNowButton from "@/components/SyncNowButton";
import WorkloadHeatmap from "@/components/WorkloadHeatmap";
import ProductiveWindowsChart from "@/components/ProductiveWindowsChart";
import PushNotificationButton from "@/components/PushNotificationButton";
import TestNotifButton from "@/components/TestNotifButton";

type CourseJoin = { name: string; color: string } | null;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
      .select("canvas_token, canvas_domain, updated_at, timezone")
      .eq("id", userId)
      .single(),
  ]);

  const now = new Date();
  const userTz = profile?.timezone ?? "America/Chicago";

  // Compute local hour and day-of-week in the user's timezone (server runs UTC).
  const localParts = new Intl.DateTimeFormat("en-US", {
    timeZone: userTz,
    hour: "numeric",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(now);
  const hourOfDay = parseInt(
    localParts.find((p) => p.type === "hour")?.value ?? "0",
    10,
  );
  const DOW_MAP: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek =
    DOW_MAP[localParts.find((p) => p.type === "weekday")?.value ?? "Sun"] ?? 0;

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

  // Build heatmap from assignments using local dates to avoid UTC date shift.
  // (e.g. an 11:59 PM CDT deadline stored as 04:59 UTC would fall on the wrong
  // day if we sliced the UTC ISO string or used a server-side SQL date cast.)
  const heatmapCounts = (assignments ?? []).reduce<Record<string, number>>(
    (acc, a) => {
      if (!a.due_at) return acc;
      const localDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: userTz,
      }).format(new Date(a.due_at));
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
  console.log("heatmap data rows:", heatmapData.length);

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

  return (
    <div className="bg-slate-900 min-h-screen">
      <header className="border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 flex items-center justify-between">
          <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            DuePulse
          </span>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-slate-400 text-sm hidden sm:block">
              {user.email}
            </span>
            <PushNotificationButton userId={userId} />
            {process.env.NODE_ENV === "development" && (
              <TestNotifButton userId={userId} />
            )}
            <SyncNowButton
              userId={userId}
              token={profile?.canvas_token ?? ""}
              domain={profile?.canvas_domain ?? ""}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="order-1 lg:order-0 lg:col-span-2 lg:col-start-1 lg:row-start-1 min-h-0 self-start">
            <WorkloadHeatmap data={heatmapData} />
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
            <ProductiveWindowsChart data={productiveWindows ?? []} />
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
            <ProductiveWindowsChart data={productiveWindows ?? []} />
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
                />
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
