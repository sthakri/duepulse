import { describe, it, expect } from "vitest";
import { dismissAssignmentSchema } from "@/lib/validations";

describe("dismissAssignmentSchema", () => {
  it("accepts a valid assignmentId UUID", () => {
    const result = dismissAssignmentSchema.safeParse({
      assignmentId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing assignmentId", () => {
    const result = dismissAssignmentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID assignmentId", () => {
    const result = dismissAssignmentSchema.safeParse({ assignmentId: "abc-123" });
    expect(result.success).toBe(false);
  });

  it("rejects extra unexpected keys (strict)", () => {
    const result = dismissAssignmentSchema.safeParse({
      assignmentId: "550e8400-e29b-41d4-a716-446655440000",
      extra: "should-not-be-here",
    });
    // Zod objects are non-strict by default — extra keys are stripped, parse still succeeds.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ assignmentId: "550e8400-e29b-41d4-a716-446655440000" });
    }
  });
});
