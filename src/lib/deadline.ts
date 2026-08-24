/**
 * Deadline nudge thresholds with catch-up semantics.
 *
 * Buckets partition (0, 13h] by upper bound: the smallest bucket containing
 * the remaining time claims the assignment. If that bucket was already sent,
 * nothing fires — smaller buckets fire later as the deadline approaches.
 * Assignments that appear late (synced mid-window) get exactly the current
 * bucket's nudge instead of being skipped.
 */
export type DeadlineType = "1h" | "6h" | "12h";

export interface DeadlineThreshold {
  type: DeadlineType;
  icon: string;
  /** Upper bound of remaining time for this bucket (lower bound = previous bucket's max). */
  maxMs: number;
}

/** Ordered most-specific (smallest window) first. */
export const DEADLINE_THRESHOLDS: DeadlineThreshold[] = [
  { type: "1h", icon: "🚨", maxMs: 90 * 60_000 },
  { type: "6h", icon: "⚡", maxMs: 7 * 3_600_000 },
  { type: "12h", icon: "⏰", maxMs: 13 * 3_600_000 },
];

export function pickDeadlineThreshold(
  remainingMs: number,
  alreadySent: ReadonlySet<DeadlineType>,
): DeadlineThreshold | null {
  for (const t of DEADLINE_THRESHOLDS) {
    if (remainingMs > t.maxMs) continue;
    return alreadySent.has(t.type) ? null : t;
  }
  return null;
}

/** Human-readable remaining time, accurate to the minute/hour. */
export function formatRemaining(remainingMs: number): string {
  const minutes = Math.max(1, Math.round(remainingMs / 60_000));
  if (minutes <= 90) return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  // Above 90 min: hours is always >= 2 by construction, so always plural.
  return `~${Math.round(minutes / 60)} hours`;
}

export function buildDeadlineMessage(
  assignments: { title: string; dueAt?: string | null }[],
  remaining: string,
  clockLabel?: string,
): string {
  if (assignments.length === 1) {
    const suffix = clockLabel ? ` ${clockLabel}` : "";
    return `${assignments[0].title} is due in ${remaining}${suffix}!`;
  }
  // Multi-assignment batch: `remaining` describes the earliest due item only,
  // so phrase it that way instead of claiming every item shares that deadline.
  if (assignments.length === 2)
    return `${assignments[0].title} and ${assignments[1].title} — next due in ${remaining}!`;
  const rest = assignments.length - 2;
  return `${assignments[0].title}, ${assignments[1].title}, and ${rest} more — next due in ${remaining}!`;
}
