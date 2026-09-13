export interface DetectedPattern {
  hour: number;
  label: string;
  avgScore: number;
  consistencyDays: number;
  confidence: "low" | "medium" | "high";
}

export interface FocusPersona {
  id: "earlyBird" | "morningWorker" | "afternoonFocuser" | "eveningLearner" | "nightOwl";
  label: string;
  emoji: string;
  description: string;
}

export interface FocusBlock {
  startHour: number;
  endHour: number;
  label: string;
}

export interface MLInsights {
  patterns: DetectedPattern[];
  persona: FocusPersona | null;
  topFocusBlock: FocusBlock | null;
  bestDayLabels: string[];
}

import { formatLocalHour } from "@/lib/time";

const PERSONAS: FocusPersona[] = [
  { id: "earlyBird", label: "Early Bird", emoji: "🌅", description: "Peak focus before the world wakes up" },
  { id: "morningWorker", label: "Morning Worker", emoji: "☀️", description: "Most productive in the late morning" },
  { id: "afternoonFocuser", label: "Afternoon Focuser", emoji: "⛅", description: "Best work happens after lunch" },
  { id: "eveningLearner", label: "Evening Learner", emoji: "🌆", description: "Finds flow in the late afternoon" },
  { id: "nightOwl", label: "Night Owl", emoji: "🌙", description: "Deep focus when others are asleep" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// productive_windows scores only ever GROW in the DB (+0.01 per touch, capped
// at 1), so without decay "Peak Hour" is an all-time record that a stale habit
// dominates forever. Decay at read time — 30-day half-life — so Insights and
// nudge eligibility reflect current routines.
export function decayedScore(score: number, updatedAt: string, now: Date): number {
  const ageDays = Math.max(0, (now.getTime() - new Date(updatedAt).getTime()) / 86_400_000);
  return score * Math.pow(0.5, ageDays / 30);
}

export function isActiveSlot(score: number, updatedAt: string, now: Date): boolean {
  return decayedScore(score, updatedAt, now) >= 0.005;
}

function personaBucket(hour: number): FocusPersona["id"] {
  if (hour >= 5 && hour <= 8) return "earlyBird";
  if (hour >= 9 && hour <= 11) return "morningWorker";
  if (hour >= 12 && hour <= 16) return "afternoonFocuser";
  if (hour >= 17 && hour <= 20) return "eveningLearner";
  return "nightOwl";
}

export function formatHour(h: number, tz?: string): string {
  return formatLocalHour(h, tz);
}

export function detectProductiveWindows(
  rows: Array<{ hour_of_day: number; day_of_week: number; score: number }>,
  userTz?: string,
): DetectedPattern[] {
  const groups = new Map<number, number[]>();
  for (const r of rows) {
    if (!groups.has(r.hour_of_day)) groups.set(r.hour_of_day, []);
    groups.get(r.hour_of_day)!.push(r.score);
  }

  const all: DetectedPattern[] = [];

  for (const [hour, scores] of groups) {
    const nonZero = scores.filter((s) => s > 0);
    if (nonZero.length === 0) continue;

    const avgScore = nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
    if (avgScore < 0.02) continue;

    const consistencyDays = nonZero.length;
    let confidence: "low" | "medium" | "high";
    if (avgScore >= 0.05 && consistencyDays >= 3) {
      confidence = "high";
    } else if ((avgScore >= 0.03 && consistencyDays >= 2) || avgScore >= 0.07) {
      confidence = "medium";
    } else {
      confidence = "low";
    }

    all.push({
      hour,
      label: formatHour(hour, userTz),
      avgScore,
      consistencyDays,
      confidence,
    });
  }

  all.sort((a, b) => {
    const sa = a.avgScore * Math.log2(1 + a.consistencyDays);
    const sb = b.avgScore * Math.log2(1 + b.consistencyDays);
    return sb - sa;
  });

  return all.slice(0, 5);
}

function derivePersona(patterns: DetectedPattern[]): FocusPersona | null {
  if (patterns.length === 0) return null;
  const topHour = patterns[0].hour;
  const id = personaBucket(topHour);
  return PERSONAS.find((p) => p.id === id) ?? null;
}

function findFocusBlock(patterns: DetectedPattern[], userTz?: string): FocusBlock | null {
  const significant = patterns.filter((p) => p.confidence !== "low");
  if (significant.length === 0) return null;

  const hours = Array.from(new Set(significant.map((p) => p.hour))).sort((a, b) => a - b);
  if (hours.length === 0) return null;

  let maxBlockStart = hours[0];
  let maxBlockEnd = hours[0];
  let currStart = hours[0];
  let currEnd = hours[0];

  for (let i = 1; i < hours.length; i++) {
    if (hours[i] === currEnd + 1) {
      currEnd = hours[i];
    } else {
      if (currEnd - currStart > maxBlockEnd - maxBlockStart) {
        maxBlockStart = currStart;
        maxBlockEnd = currEnd;
      }
      currStart = hours[i];
      currEnd = hours[i];
    }
  }

  if (currEnd - currStart > maxBlockEnd - maxBlockStart) {
    maxBlockStart = currStart;
    maxBlockEnd = currEnd;
  }

  if (maxBlockEnd - maxBlockStart < 1) return null;

  return {
    startHour: maxBlockStart,
    endHour: maxBlockEnd,
    // Hour 16 covers 16:00–17:00, so the label renders end + 1. Without this
    // a 2–5 PM block displayed as "2 PM – 4 PM".
    label: `${formatHour(maxBlockStart, userTz)} – ${formatHour(maxBlockEnd + 1, userTz)}`,
  };
}

function findBestDays(
  rows: Array<{ hour_of_day: number; day_of_week: number; score: number }>,
): string[] {
  const dayScores = new Map<number, number>();
  for (const r of rows) {
    dayScores.set(r.day_of_week, (dayScores.get(r.day_of_week) ?? 0) + r.score);
  }

  return Array.from(dayScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([d]) => DAY_LABELS[d] ?? "");
}

export function analyzeProductiveWindows(
  rows: Array<{ hour_of_day: number; day_of_week: number; score: number }>,
  userTz?: string,
): MLInsights {
  const patterns = detectProductiveWindows(rows, userTz);
  const persona = derivePersona(patterns);
  const topFocusBlock = findFocusBlock(patterns, userTz);
  const bestDayLabels = findBestDays(rows);

  return { patterns, persona, topFocusBlock, bestDayLabels };
}
