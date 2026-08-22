import { describe, it, expect } from "vitest";
import { filterDailyOverdueNudge, filterNeverNudgedOverdue } from "@/lib/overdue-dedup";

describe("filterDailyOverdueNudge — Section D daily overdue dedup", () => {
  const baseTime = new Date("2026-08-21T12:00:00Z");

  it("returns all assignments when no existing logs exist", () => {
    const assignments = [
      { id: "a1", title: "HW1" },
      { id: "a2", title: "HW2" },
    ];
    const result = filterDailyOverdueNudge(assignments, [], baseTime);
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("drops assignments nudged within the last 24 hours", () => {
    const assignments = [
      { id: "a1", title: "HW1" },
      { id: "a2", title: "HW2" },
      { id: "a3", title: "HW3" },
    ];
    const logs = [
      { assignment_id: "a1", sent_at: new Date("2026-08-21T06:00:00Z").toISOString() }, // 6h ago -> drop
      { assignment_id: "a3", sent_at: new Date("2026-08-19T10:00:00Z").toISOString() }, // 2 days ago -> allow
    ];
    const result = filterDailyOverdueNudge(assignments, logs, baseTime);
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id)).toEqual(["a2", "a3"]);
  });

  it("allows re-nudging an overdue assignment if >24 hours have passed", () => {
    const assignments = [{ id: "a1", title: "HW1" }];
    const logs = [
      { assignment_id: "a1", sent_at: new Date("2026-08-20T11:00:00Z").toISOString() }, // 25h ago
    ];
    const result = filterDailyOverdueNudge(assignments, logs, baseTime);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a1");
  });

  it("ignores log rows with null assignment_id (productive_window logs)", () => {
    const assignments = [{ id: "a1" }];
    const logs = [
      { assignment_id: null, sent_at: baseTime.toISOString() },
      { assignment_id: "a1", sent_at: baseTime.toISOString() },
    ];
    const result = filterDailyOverdueNudge(assignments, logs, baseTime);
    expect(result).toHaveLength(0);
  });

  it("handles empty assignment list", () => {
    expect(filterDailyOverdueNudge([], [{ assignment_id: "nope" }], baseTime)).toEqual([]);
  });

  it("supports filterNeverNudgedOverdue alias", () => {
    const assignments = [{ id: "a1" }, { id: "a2" }];
    const logs = [{ assignment_id: "a1" }];
    const result = filterNeverNudgedOverdue(assignments, logs);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a2");
  });
});
