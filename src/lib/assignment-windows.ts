// Pure date predicates for assignment filtering — extracted so they can be
// unit-tested without Trigger.dev or Supabase.
// ponytail: these are the only pieces of the nudge/window logic that aren't
// IO; everything else is integration and tested end-to-end via the dev route.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Window used by /dashboard/assignments and /dashboard: past 14d + next 14d. */
export function isInTwoWeekWindow(dueAt: string | null, now: Date): boolean {
  if (!dueAt) return true; // no-date assignments stay visible
  const due = new Date(dueAt).getTime();
  const t = now.getTime();
  return due >= t - 14 * MS_PER_DAY && due <= t + 14 * MS_PER_DAY;
}

/** Cleanup cutoff: completed assignments older than 5 days are deleted. */
export function isEligibleForCleanup(updatedAt: string, now: Date): boolean {
  return new Date(updatedAt).getTime() < now.getTime() - 5 * MS_PER_DAY;
}

/**
 * Overdue candidate selection + dedup. Returns the assignments that should be
 * nudged right now (past-due, incomplete, not nudged in the last 24h).
 */
export function selectOverdueToNudge(
  assignments: { id: string; due_at: string | null }[],
  recentlyNudgedAssignmentIds: Set<string>,
  now: Date,
): { id: string; due_at: string | null }[] {
  return assignments.filter((a) => {
    if (!a.due_at) return false;
    if (new Date(a.due_at).getTime() >= now.getTime()) return false;
    return !recentlyNudgedAssignmentIds.has(a.id);
  });
}
