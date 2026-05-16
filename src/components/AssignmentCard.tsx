import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AssignmentCardProps {
  title: string
  course_name: string
  due_at: string | null
  points_possible: number | null
  canvas_assignment_id: string
  course_color?: string
}

function getDueDateInfo(due_at: string): {
  label: string
  isOverdue: boolean
  isDueSoon: boolean
} {
  const now = new Date()
  const due = new Date(due_at)
  const diffMs = due.getTime() - now.getTime()

  if (diffMs < 0) {
    const days = Math.max(1, Math.round(-diffMs / 86_400_000))
    return {
      label: `Overdue by ${days} day${days === 1 ? "" : "s"}`,
      isOverdue: true,
      isDueSoon: false,
    }
  }

  const isDueSoon = diffMs <= 48 * 60 * 60 * 1000
  const diffDays = Math.round(diffMs / 86_400_000)

  let label: string
  if (diffDays === 0) {
    label = "Due today"
  } else if (diffDays === 1) {
    label = "Due tomorrow"
  } else {
    label = `Due in ${diffDays} days`
  }

  return { label, isOverdue: false, isDueSoon }
}

export default function AssignmentCard({
  title,
  course_name,
  due_at,
  points_possible,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canvas_assignment_id,
  course_color = "#6366f1",
}: AssignmentCardProps) {
  const dueInfo = due_at ? getDueDateInfo(due_at) : null
  const isOverdue = dueInfo?.isOverdue ?? false
  const isDueSoon = dueInfo?.isDueSoon ?? false

  return (
    <Card
      className={cn(
        "bg-slate-800 rounded-xl p-4 flex flex-col gap-2 ring-0",
        isOverdue && "opacity-60"
      )}
      style={{ borderLeft: `4px solid ${course_color}` }}
    >
      <p className="text-slate-400 text-xs uppercase tracking-wide leading-none">
        {course_name}
      </p>
      <p className="text-white font-semibold text-base truncate">{title}</p>
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
