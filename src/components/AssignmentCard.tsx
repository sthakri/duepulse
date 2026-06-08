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

  // Derive today's local date string (YYYY-MM-DD) in the user's timezone.
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: userTz })
  const todayStr = fmt.format(now)
  const dueDayStr = fmt.format(due)

  // Parse the YYYY-MM-DD strings as UTC midnight dates for clean day-diff math.
  const todayMidnight = new Date(`${todayStr}T00:00:00Z`)
  const dueMidnight = new Date(`${dueDayStr}T00:00:00Z`)
  const diffDays = Math.round(
    (dueMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24),
  )

  const relativeLabel =
    diffDays < 0
      ? `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""}`
      : diffDays === 0
        ? "Due today"
        : diffDays === 1
          ? "Due tomorrow"
          : `Due in ${diffDays} days`

  // Format the exact local time in the user's timezone (e.g. "11:59 PM CDT").
  const exactTime = new Intl.DateTimeFormat("en-US", {
    timeZone: userTz,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(due)

  const label = diffDays >= 0 ? `${relativeLabel} at ${exactTime}` : relativeLabel

  return { label, isOverdue: diffDays < 0, isDueSoon: diffDays >= 0 && diffDays <= 1 }
}

export default function AssignmentCard({
  title,
  course_name,
  due_at,
  points_possible,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canvas_assignment_id,
  course_color = "#6366f1",
  userTz,
}: AssignmentCardProps) {
  const dueInfo = due_at ? getDueDateInfo(due_at, userTz) : null
  const isOverdue = dueInfo?.isOverdue ?? false
  const isDueSoon = dueInfo?.isDueSoon ?? false

  return (
    <Card
      className={cn(
        "bg-slate-800 rounded-xl p-4 flex flex-col gap-2 ring-0 border-0",
        isOverdue && "opacity-60"
      )}
      style={{ borderLeft: `4px solid ${course_color}` }}
    >
      <p className="text-slate-400 text-xs uppercase tracking-wide leading-none">
        {course_name}
      </p>
      <p className="text-white font-semibold text-base">{title}</p>
      <div className="flex flex-wrap items-center gap-2">
        {due_at ? (
          <span className="text-slate-400 text-xs">{dueInfo!.label}</span>
        ) : (
          <span className="text-slate-500 text-xs">No due date</span>
        )}
        {points_possible !== null && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-slate-700 text-slate-300">
            {points_possible} pts
          </span>
        )}
        {isDueSoon && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-red-500 text-white">
            Due Soon
          </span>
        )}
        {isOverdue && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-red-500 text-white">
            Overdue
          </span>
        )}
      </div>
    </Card>
  )
}
