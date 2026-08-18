import { describe, it, expect } from "vitest";

// Unit test the pure pieces of canvas.ts without making network calls.
// We import the module to verify CanvasAuthError is exported and shaped right.
import { CanvasAuthError } from "@/lib/canvas";

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
