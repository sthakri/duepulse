import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AssignmentCardProps {
  title: string
  course_name: string
  due_at: string | null
  points_possible: number | null
  canvas_assignment_id: string
  course_color?: string
  userTz: string
}

function getDueDateInfo(due_at: string, userTz: string): { label: string; isOverdue: boolean; isDueSoon: boolean } {
  const due = new Date(due_at)
  const now = new Date()
  const msUntilDue = due.getTime() - now.getTime()
  const isOverdue = msUntilDue < 0
  const isDueSoon = !isOverdue && msUntilDue <= 24 * 60 * 60 * 1000

  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: userTz })
  const todayStr = fmt.format(now)
  const dueDayStr = fmt.format(due)
  const todayMidnight = new Date(`${todayStr}T00:00:00Z`)
  const dueMidnight = new Date(`${dueDayStr}T00:00:00Z`)
  const diffDays = Math.round((dueMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))

  const exactTime = new Intl.DateTimeFormat("en-US", { timeZone: userTz, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(due)

  let label: string
  if (isOverdue) {
    if (diffDays <= -1) {
      const daysAgo = Math.abs(diffDays)
      label = `Overdue by ${daysAgo} day${daysAgo > 1 ? "s" : ""}`
    } else {
      const hoursOverdue = Math.floor(Math.abs(msUntilDue) / 3_600_000)
      label = hoursOverdue >= 1 ? `Overdue by ${hoursOverdue}h (was due at ${exactTime})` : `Overdue (was due at ${exactTime})`
    }
  } else {
    const relativeLabel = diffDays === 0 ? "Due today" : diffDays === 1 ? "Due tomorrow" : `Due in ${diffDays} days`
    label = `${relativeLabel} at ${exactTime}`
  }

  return { label, isOverdue, isDueSoon }
}

export default function AssignmentCard({ title, course_name, due_at, points_possible, canvas_assignment_id: _cid, course_color = "#6366F1", userTz }: AssignmentCardProps) {
  const dueInfo = due_at ? getDueDateInfo(due_at, userTz) : null
  const isOverdue = dueInfo?.isOverdue ?? false
  const isDueSoon = dueInfo?.isDueSoon ?? false

  return (
    <Card
      className={cn(
        "rounded-[18px] bg-[#1E293B]/80 border border-[#334155]/70 p-4 flex flex-col gap-2 ring-0 shadow-none hover:border-[#6366F1]/40 hover:bg-[#243044]/80 transition-all duration-150",
        isOverdue && "opacity-70"
      )}
      style={{ borderLeft: `3px solid ${course_color}` }}
    >
      <p className="text-[#64748B] text-xs uppercase tracking-wide leading-none">{course_name}</p>
      <p className="text-[#F8FAFC] font-semibold text-base">{title}</p>
      <div className="flex flex-wrap items-center gap-2">
        {due_at ? (
          <span className="text-[#94A3B8] text-xs">{dueInfo!.label}</span>
        ) : (
          <span className="text-[#64748B] text-xs">No due date</span>
        )}
        {points_possible !== null && (
          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-[#243044] border border-[#334155] text-[#94A3B8]">
            {points_possible} pts
          </span>
        )}
        {isDueSoon && (
          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B]">
            Due Soon
          </span>
        )}
        {isOverdue && (
          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]">
            Overdue
          </span>
        )}
      </div>
    </Card>
  )
}
