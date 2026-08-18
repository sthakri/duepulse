// ponytail: pure helper for Section D overdue dedup, extracted so it can be
// unit-tested without loading env vars or Trigger.dev. Spec: an overdue
// assignment gets exactly one nudge — any matching log row disqualifies it.
export function filterNeverNudgedOverdue<
  A extends { id: string },
  L extends { assignment_id: string | null },
>(assignments: A[], existingLogs: L[]): A[] {
  const alreadyNudged = new Set(
    existingLogs
      .map((l) => l.assignment_id)
      .filter((x): x is string => x !== null),
  );
  return assignments.filter((a) => !alreadyNudged.has(a.id));
}
