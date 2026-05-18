import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AssignmentCard from "@/components/AssignmentCard"
import SyncNowButton from "@/components/SyncNowButton"

type CourseJoin = { name: string; color: string } | null

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect("/login")

  const userId = session.user.id

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
  ])

  const now = new Date()
  const hourOfDay = now.getUTCHours()
  const dayOfWeek = now.getUTCDay()

  await supabase.from("productive_windows").upsert(
    {
      user_id: userId,
      hour_of_day: hourOfDay,
      day_of_week: dayOfWeek,
      score: 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,hour_of_day,day_of_week" }
  )

  return (
    <div className="bg-slate-900 min-h-screen">
      <div className="flex items-center justify-between px-6 py-4">
        <span className="text-white font-bold text-lg">DuePulse</span>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">{session.user.email}</span>
          <SyncNowButton
            userId={userId}
            token={profile?.canvas_token ?? ""}
            domain={profile?.canvas_domain ?? ""}
          />
        </div>
      </div>

      <main className="px-6 pb-10 flex flex-col gap-6">
        <div className="rounded-xl bg-slate-800 h-48 flex items-center justify-center text-slate-400 text-sm">
          Heatmap loads in Session 8
        </div>

        <div className="flex flex-col gap-3">
          {(assignments ?? []).map((a) => {
            const course = a.courses as CourseJoin
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
            )
          })}
        </div>
      </main>
    </div>
  )
}
