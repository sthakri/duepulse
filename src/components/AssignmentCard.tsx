"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

interface AssignmentCardProps {
  id: string;
  title: string;
  course_name: string;
  due_at: string | null;
  points_possible: number | null;
  canvas_assignment_id: string;
  course_color?: string;
  userTz: string;
  is_completed?: boolean;
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

export default function AssignmentCard({
  id,
  title,
  course_name,
  due_at,
  points_possible,
  canvas_assignment_id: _canvas_assignment_id,
  course_color = "#6366F1",
  userTz,
  is_completed = false,
}: AssignmentCardProps) {
  const router = useRouter();
  const [dismissing, setDismissing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(is_completed);

  const dueInfo = due_at ? getDueDateInfo(due_at, userTz) : null;
  const isOverdue = !completed && (dueInfo?.isOverdue ?? false);
  const isDueSoon = !completed && (dueInfo?.isDueSoon ?? false);

  async function handleToggleComplete() {
    setCompleting(true);
    const nextState = !completed;
    setCompleted(nextState);
    try {
      const res = await fetch("/api/assignments/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: id, completed: nextState }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        setCompleted(!nextState); // rollback
        toast.error(data.error ?? "Failed to update status");
        return;
      }
      toast.success(nextState ? "Assignment marked as completed ✓" : "Assignment marked as incomplete");
      router.refresh();
    } catch {
      setCompleted(!nextState); // rollback
      toast.error("Network error — could not update assignment");
    } finally {
      setCompleting(false);
    }
  }

  async function handleDismiss() {
    setDismissing(true);
    try {
      const res = await fetch("/api/assignments/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: id }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Dismiss failed"); return; }
      toast.success("Assignment dismissed");
      router.refresh();
    } catch { toast.error("Network error — dismiss failed"); }
    finally { setDismissing(false); }
  }

  return (
    <Card
      className={cn(
        "rounded-[18px] bg-[#1E293B]/80 border border-[#334155]/70 p-4 flex flex-col gap-2 ring-0 shadow-none hover:border-[#6366F1]/40 hover:bg-[#243044]/80 transition-all duration-150 relative group",
        isOverdue && "opacity-75",
        completed && "opacity-60 bg-[#1E293B]/40"
      )}
      style={{ borderLeft: `3px solid ${course_color}` }}
    >
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1">
        {/* Complete / Checkmark toggle button */}
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={completing}
          aria-label={completed ? "Mark as incomplete" : "Mark as completed"}
          title={completed ? "Mark as incomplete" : "Mark as completed"}
          className={cn(
            "rounded-md p-1 transition disabled:opacity-50 flex items-center justify-center",
            completed
              ? "bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30"
              : "text-[#64748B] hover:text-[#10B981] hover:bg-[#10B981]/10 border border-transparent hover:border-[#10B981]/20"
          )}
        >
          <Check size={14} className={completed ? "stroke-[2.5]" : "stroke-[1.5]"} />
        </button>

        {/* Dismiss button for overdue */}
        {isOverdue && (
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissing}
            aria-label="Dismiss overdue assignment"
            title="Dismiss this overdue assignment"
            className="rounded-md p-1 text-[#64748B] transition hover:bg-[#334155] hover:text-[#CBD5E1] disabled:opacity-50"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <p className="text-[#64748B] text-xs uppercase tracking-wide leading-none">{course_name}</p>
      <p className={cn("text-[#F8FAFC] font-semibold text-base pr-12", completed && "line-through text-[#94A3B8]")}>
        {title}
      </p>
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
        {completed && (
          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]">
            Completed
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
  );
}
