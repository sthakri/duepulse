import { describe, it, expect } from "vitest";
import {
  DEADLINE_THRESHOLDS,
  pickDeadlineThreshold,
  formatRemaining,
  buildDeadlineMessage,
} from "@/lib/deadline";

const MIN = 60_000;
const H = 3_600_000;

describe("pickDeadlineThreshold — catch-up bucket selection", () => {
  it("picks 1h when 45 minutes remain", () => {
    expect(pickDeadlineThreshold(45 * MIN, new Set())?.type).toBe("1h");
  });

  it("picks 1h catch-up even when only 25 minutes remain (late sync)", () => {
    expect(pickDeadlineThreshold(25 * MIN, new Set())?.type).toBe("1h");
  });

  it("picks 6h when 5 hours remain", () => {
    expect(pickDeadlineThreshold(5 * H, new Set())?.type).toBe("6h");
  });

  it("picks 6h catch-up at 100 minutes (missed the 12h moment)", () => {
    expect(pickDeadlineThreshold(100 * MIN, new Set())?.type).toBe("6h");
  });

  it("picks 12h when 11 hours remain", () => {
    expect(pickDeadlineThreshold(11 * H, new Set())?.type).toBe("12h");
  });

  it("returns null beyond the 13h outer bound", () => {
    expect(pickDeadlineThreshold(14 * H, new Set())).toBeNull();
  });

  it("returns nothing when the containing bucket was already sent", () => {
    expect(pickDeadlineThreshold(5 * H, new Set(["6h"]))).toBeNull();
  });

  it("does not fire a stale larger bucket after a smaller one already sent", () => {
    // 6h was sent at 7h remaining; now 3h remain — 12h must NOT catch up.
    expect(pickDeadlineThreshold(3 * H, new Set(["6h"]))).toBeNull();
  });

  it("fires a smaller bucket later in the lifecycle after the larger sent", () => {
    expect(pickDeadlineThreshold(45 * MIN, new Set(["12h", "6h"]))?.type).toBe("1h");
  });

  it("thresholds are ordered smallest-window first", () => {
    const order = DEADLINE_THRESHOLDS.map((t) => t.type);
    expect(order).toEqual(["1h", "6h", "12h"]);
  });
});

describe("formatRemaining — accurate labels", () => {
  it("formats minutes for the 1h bucket", () => {
    expect(formatRemaining(45 * MIN)).toBe("45 minutes");
  });

  it("floors at 1 minute, with singular grammar", () => {
    expect(formatRemaining(0.4 * MIN)).toBe("1 minute");
  });

  it("formats hours for larger buckets", () => {
    expect(formatRemaining(5.1 * H)).toBe("~5 hours");
    expect(formatRemaining(12.9 * H)).toBe("~13 hours");
  });

  it("stays in minutes up to the 90-minute boundary", () => {
    expect(formatRemaining(72 * MIN)).toBe("72 minutes");
    expect(formatRemaining(90 * MIN)).toBe("90 minutes");
  });

  it("switches to rounded hours above 90 minutes", () => {
    expect(formatRemaining(91 * MIN)).toBe("~2 hours");
  });
});

describe("buildDeadlineMessage", () => {
  it("single assignment with clock label", () => {
    expect(
      buildDeadlineMessage([{ title: "Calc HW" }], "45 minutes", "(by 6:30 PM)"),
    ).toBe("Calc HW is due in 45 minutes (by 6:30 PM)!");
  });

  it("two assignments anchor the earliest deadline only", () => {
    expect(
      buildDeadlineMessage([{ title: "A" }, { title: "B" }], "~5 hours"),
    ).toBe("A and B — next due in ~5 hours!");
  });

  it("three or more collapse the rest and anchor the earliest", () => {
    expect(
      buildDeadlineMessage([{ title: "A" }, { title: "B" }, { title: "C" }, { title: "D" }], "~5 hours"),
    ).toBe("A, B, and 2 more — next due in ~5 hours!");
  });
});
