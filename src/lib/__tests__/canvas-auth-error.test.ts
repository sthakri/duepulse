import { describe, it, expect } from "vitest";
import { CanvasAuthError, isCanvasItemCompleted } from "@/lib/canvas";

describe("CanvasAuthError", () => {
  it("is an Error subclass with the right name", () => {
    const err = new CanvasAuthError("Canvas returned 401");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CanvasAuthError);
    expect(err.name).toBe("CanvasAuthError");
    expect(err.message).toBe("Canvas returned 401");
  });

  it("is distinguishable from a generic Error via instanceof", () => {
    const authErr: Error = new CanvasAuthError("expired");
    const genericErr: Error = new Error("network down");

    expect(authErr instanceof CanvasAuthError).toBe(true);
    expect(genericErr instanceof CanvasAuthError).toBe(false);
  });
});

describe("isCanvasItemCompleted", () => {
  it("returns true when student planner override marked_complete is true", () => {
    expect(isCanvasItemCompleted({ planner_override: { marked_complete: true } })).toBe(true);
  });

  it("returns true when student planner override dismissed is true", () => {
    expect(isCanvasItemCompleted({ planner_override: { dismissed: true } })).toBe(true);
  });

  it("returns true when submissions is boolean true", () => {
    expect(isCanvasItemCompleted({ submissions: true })).toBe(true);
  });

  it("returns true when submissions.submitted is true", () => {
    expect(isCanvasItemCompleted({ submissions: { submitted: true } })).toBe(true);
  });

  it("returns true when submissions.workflow_state is submitted or graded", () => {
    expect(isCanvasItemCompleted({ submissions: { workflow_state: "submitted" } })).toBe(true);
    expect(isCanvasItemCompleted({ submissions: { workflow_state: "graded" } })).toBe(true);
    expect(isCanvasItemCompleted({ submissions: { workflow_state: "pending_review" } })).toBe(true);
  });

  it("returns true when plannable has_submitted_submissions is true", () => {
    expect(isCanvasItemCompleted({ plannable: { has_submitted_submissions: true } })).toBe(true);
  });

  it("returns false when submissions is false or unsubmitted", () => {
    expect(isCanvasItemCompleted({ submissions: false })).toBe(false);
    expect(isCanvasItemCompleted({ submissions: { submitted: false, workflow_state: "unsubmitted" } })).toBe(false);
    expect(isCanvasItemCompleted({})).toBe(false);
  });
});
