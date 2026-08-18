import { describe, it, expect } from "vitest";
import { filterNeverNudgedOverdue } from "@/lib/overdue-dedup";

describe("filterNeverNudgedOverdue — Section D once-ever dedup", () => {
  it("returns all assignments when no existing logs exist", () => {
    const assignments = [
      { id: "a1", title: "HW1" },
      { id: "a2", title: "HW2" },
    ];
    const result = filterNeverNudgedOverdue(assignments, []);
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("drops assignments that already have ANY overdue log", () => {
    const assignments = [
      { id: "a1", title: "HW1" },
      { id: "a2", title: "HW2" },
      { id: "a3", title: "HW3" },
    ];
    const logs = [
      { assignment_id: "a1" },
      { assignment_id: "a3" },
    ];
    const result = filterNeverNudgedOverdue(assignments, logs);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a2");
  });

  it("returns empty when all assignments already have overdue logs", () => {
    const assignments = [{ id: "a1" }, { id: "a2" }];
    const logs = [{ assignment_id: "a1" }, { assignment_id: "a2" }];
    const result = filterNeverNudgedOverdue(assignments, logs);
    expect(result).toHaveLength(0);
  });

  it("ignores log rows with null assignment_id (productive_window logs)", () => {
    const assignments = [{ id: "a1" }];
    const logs = [
      { assignment_id: null },
      { assignment_id: "a1" },
    ];
    const result = filterNeverNudgedOverdue(assignments, logs);
    expect(result).toHaveLength(0);
  });

  it("handles empty assignment list", () => {
    expect(filterNeverNudgedOverdue([], [{ assignment_id: "nope" }])).toEqual([]);
  });
});
