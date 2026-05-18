import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AssignmentCard from "@/components/AssignmentCard";
import SyncNowButton from "@/components/SyncNowButton";
import WorkloadHeatmap from "@/components/WorkloadHeatmap";

type CourseJoin = { name: string; color: string } | null;

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const userId = session.user.id;

  const [{ data: assignments }, { data: profile }] = await Promise.all([
    supabase
      .from("assignments")
      .select("*, courses(name, color)")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("profiles")
      .select("canvas_token, canvas_domain, updated_at")
      .eq("id", userId)
      .single(),
  ]);

  const now = new Date();
  const hourOfDay = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();

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

  const { data: rawHeatmap } = await supabase.rpc('get_workload_heatmap',
    { p_user_id: userId })

  const heatmapData = (rawHeatmap ?? []).map((row: any) => ({
    due_at: row.due_date,
    assignment_count: row.assignment_count,
  }))

  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const totalCount = (assignments ?? []).length
  const overdueCount = (assignments ?? []).filter(
    a => a.due_at && new Date(a.due_at) < now
  ).length
  const dueThisWeekCount = (assignments ?? []).filter(
    a => a.due_at && new Date(a.due_at) >= now && new Date(a.due_at) <= weekFromNow
  ).length

  return (
    <div className="bg-slate-900 min-h-screen">
      <header className="border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            DuePulse
          </span>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm hidden sm:block">{session.user.email}</span>
            <SyncNowButton
              userId={userId}
              token={profile?.canvas_token ?? ""}
              domain={profile?.canvas_domain ?? ""}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
            <WorkloadHeatmap data={heatmapData} />
          </div>

          <div className="lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-2">
            <div className="rounded-xl bg-slate-800 p-6 lg:sticky lg:top-6">
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
                  <p className="text-3xl font-bold text-red-400">{overdueCount}</p>
                  <p className="text-slate-400 text-sm mt-1">Overdue</p>
                </div>
                <div className="h-px bg-slate-700/50" />
                <div>
                  <p className="text-3xl font-bold text-amber-400">{dueThisWeekCount}</p>
                  <p className="text-slate-400 text-sm mt-1">Due this week</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 lg:col-start-1 lg:row-start-2 flex flex-col gap-3">
            {(assignments ?? []).map((a) => {
              const course = a.courses as CourseJoin;
              return (
                <AssignmentCard
                  key={a.id}
                  title={a.title}
                  course_name={course?.name ?? "Unknown"}
                  due_at={a.due_at}
                  points_possible={
                    a.points_possible !== null ? Number(a.points_possible) : null
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
