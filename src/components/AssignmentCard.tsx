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

function getDueDateInfo(
  due_at: string,
  userTz: string,
): {
  label: string
  isOverdue: boolean
  isDueSoon: boolean
} {
  const due = new Date(due_at)
  const now = new Date()
  const msUntilDue = due.getTime() - now.getTime()

  // ── Exact-time flags ───────────────────────────────────────────────────────
  // isOverdue: the actual moment has already passed (not just the calendar day)
  const isOverdue = msUntilDue < 0
  // isDueSoon: not overdue, and due within the next 24 hours
  const isDueSoon = !isOverdue && msUntilDue <= 24 * 60 * 60 * 1000

  // ── Calendar-day diff in the user's timezone (for relative label text) ─────
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: userTz })
  const todayStr = fmt.format(now)
  const dueDayStr = fmt.format(due)
  const todayMidnight = new Date(`${todayStr}T00:00:00Z`)
  const dueMidnight = new Date(`${dueDayStr}T00:00:00Z`)
  const diffDays = Math.round(
    (dueMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24),
  )

  // ── Exact due time in user's timezone (e.g. "11:59 PM CDT") ───────────────
  const exactTime = new Intl.DateTimeFormat("en-US", {
    timeZone: userTz,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(due)

  // ── Label ──────────────────────────────────────────────────────────────────
  let label: string
  if (isOverdue) {
    if (diffDays <= -1) {
      // Past calendar day(s)
      const daysAgo = Math.abs(diffDays)
      label = `Overdue by ${daysAgo} day${daysAgo > 1 ? "s" : ""}`
    } else {
      // Same calendar day but time has passed — show hours overdue
      const hoursOverdue = Math.floor(Math.abs(msUntilDue) / 3_600_000)
      label = hoursOverdue >= 1
        ? `Overdue by ${hoursOverdue}h (was due at ${exactTime})`
        : `Overdue (was due at ${exactTime})`
    }
  } else {
    const relativeLabel =
      diffDays === 0
        ? "Due today"
        : diffDays === 1
          ? "Due tomorrow"
          : `Due in ${diffDays} days`
    label = `${relativeLabel} at ${exactTime}`
  }

  return { label, isOverdue, isDueSoon }
}

export default function AssignmentCard({
  title,
  course_name,
  due_at,
  points_possible,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canvas_assignment_id,
  course_color = "#D6B36A",
  userTz,
}: AssignmentCardProps) {
  const dueInfo = due_at ? getDueDateInfo(due_at, userTz) : null
  const isOverdue = dueInfo?.isOverdue ?? false
  const isDueSoon = dueInfo?.isDueSoon ?? false

  return (
    <Card
      className={cn(
        "rounded-[18px] bg-[#151C2B] border border-[#2A3444] p-4 flex flex-col gap-2 ring-0 shadow-none hover:border-[#3A4454] transition-colors duration-150",
        isOverdue && "opacity-70"
      )}
      style={{ borderLeft: `3px solid ${course_color}` }}
    >
      <p className="text-[#7E8AA0] text-xs uppercase tracking-wide leading-none">
        {course_name}
      </p>
      <p className="text-[#F6F1E8] font-semibold text-base">{title}</p>
      <div className="flex flex-wrap items-center gap-2">
        {due_at ? (
          <span className="text-[#AAB4C4] text-xs">{dueInfo!.label}</span>
        ) : (
          <span className="text-[#7E8AA0] text-xs">No due date</span>
        )}
        {points_possible !== null && (
          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-[#1C2637] border border-[#2A3444] text-[#AAB4C4]">
            {points_possible} pts
          </span>
        )}
        {isDueSoon && (
          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-[#D6B36A]/15 border border-[#D6B36A]/30 text-[#D6B36A]">
            Due Soon
          </span>
        )}
        {isOverdue && (
          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-[#C97064]/15 border border-[#C97064]/30 text-[#C97064]">
            Overdue
          </span>
        )}
      </div>
    </Card>
  )
}
