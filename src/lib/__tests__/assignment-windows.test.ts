import { describe, it, expect } from "vitest";
import {
  isInTwoWeekWindow,
  isEligibleForCleanup,
  selectOverdueToNudge,
} from "@/lib/assignment-windows";

const NOW = new Date("2026-08-16T12:00:00Z");
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const iso = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

describe("isInTwoWeekWindow", () => {
  it("includes assignments due within the next 14 days", () => {
    expect(isInTwoWeekWindow(iso(3 * MS_PER_DAY), NOW)).toBe(true);
    expect(isInTwoWeekWindow(iso(14 * MS_PER_DAY), NOW)).toBe(true);
  });

  it("includes overdue assignments within the past 14 days", () => {
    expect(isInTwoWeekWindow(iso(-3 * MS_PER_DAY), NOW)).toBe(true);
    expect(isInTwoWeekWindow(iso(-14 * MS_PER_DAY), NOW)).toBe(true);
  });

  it("excludes assignments older than 14 days overdue", () => {
    expect(isInTwoWeekWindow(iso(-15 * MS_PER_DAY), NOW)).toBe(false);
    expect(isInTwoWeekWindow(iso(-60 * MS_PER_DAY), NOW)).toBe(false);
  });

  it("excludes assignments due more than 14 days out", () => {
    expect(isInTwoWeekWindow(iso(15 * MS_PER_DAY), NOW)).toBe(false);
  });

  it("keeps null-due-date assignments visible", () => {
    expect(isInTwoWeekWindow(null, NOW)).toBe(true);
  });
});

describe("isEligibleForCleanup", () => {
  it("flags completed assignments updated more than 5 days ago", () => {
    expect(isEligibleForCleanup(iso(-6 * MS_PER_DAY), NOW)).toBe(true);
    expect(isEligibleForCleanup(iso(-30 * MS_PER_DAY), NOW)).toBe(true);
  });

  it("does not flag assignments updated within the last 5 days", () => {
    expect(isEligibleForCleanup(iso(-5 * MS_PER_DAY), NOW)).toBe(false);
    expect(isEligibleForCleanup(iso(-1 * MS_PER_DAY), NOW)).toBe(false);
    expect(isEligibleForCleanup(iso(0), NOW)).toBe(false);
  });
});

describe("selectOverdueToNudge", () => {
  const overdue = (id: string, ageMs: number) => ({ id, due_at: iso(-ageMs) });
  const future = (id: string, ms: number) => ({ id, due_at: iso(ms) });
  const noDate = (id: string) => ({ id, due_at: null });

  it("selects past-due assignments not nudged in the last 24h", () => {
    const assignments = [overdue("a", 2 * MS_PER_DAY), overdue("b", 5 * MS_PER_DAY)];
    const result = selectOverdueToNudge(assignments, new Set(), NOW);
    expect(result.map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("skips assignments nudged in the last 24h (dedup)", () => {
    const assignments = [overdue("a", 2 * MS_PER_DAY), overdue("b", 5 * MS_PER_DAY)];
    const result = selectOverdueToNudge(assignments, new Set(["a"]), NOW);
    expect(result.map((a) => a.id)).toEqual(["b"]);
  });

  it("skips future-due and no-date assignments", () => {
    const assignments = [
      overdue("a", MS_PER_DAY),
      future("b", 3 * MS_PER_DAY),
      noDate("c"),
    ];
    const result = selectOverdueToNudge(assignments, new Set(), NOW);
    expect(result.map((a) => a.id)).toEqual(["a"]);
  });

  it("returns nothing when all overdue are recently nudged", () => {
    const assignments = [overdue("a", 2 * MS_PER_DAY)];
    const result = selectOverdueToNudge(assignments, new Set(["a"]), NOW);
    expect(result).toEqual([]);
  });
});
