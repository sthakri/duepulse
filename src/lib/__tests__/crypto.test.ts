import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    ENCRYPTION_KEY: "LJUsvkb+D/XvVIB2AKHtdcB07UGoF9WPfbhwn3xwpRw=",
  },
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

import { encrypt, decrypt, isLikelyEncrypted, decryptOrRaw } from "@/lib/crypto";

describe("crypto", () => {
  beforeEach(() => {
    mockEnv.ENCRYPTION_KEY = "LJUsvkb+D/XvVIB2AKHtdcB07UGoF9WPfbhwn3xwpRw=";
  });

  describe("encrypt + decrypt", () => {
    it("round-trips a plaintext string", async () => {
      const plain = "3~BRtQx3h6VZMEHQ9E9kuXnye9Gv74tAKWT3NXfQTaeEXT6QM2ZczLJmF4BaMH38DR";
      const ct = await encrypt(plain);
      const result = await decrypt(ct);
      expect(result).toBe(plain);
    });

    it("produces different ciphertexts for the same plaintext (random IV)", async () => {
      const plain = "hello-world-token";
      const ct1 = await encrypt(plain);
      const ct2 = await encrypt(plain);
      expect(ct1).not.toBe(ct2);
    });
  });

  describe("isLikelyEncrypted", () => {
    it("returns false for short Canvas tokens", () => {
      expect(isLikelyEncrypted("3~abc")).toBe(false);
    });

    it("returns false for Canvas tokens (digit~ prefix)", () => {
      expect(isLikelyEncrypted("3~BRtQx3h6VZMEHQ9E9kuXnye9Gv74tAKWT3NXfQTaeEXT6QM2ZczLJmF4BaMH38DR")).toBe(false);
    });

    it("returns true for base64 ciphertext", async () => {
      const ct = await encrypt("test-token-value");
      expect(isLikelyEncrypted(ct)).toBe(true);
    });

    it("returns false for non-base64 strings", () => {
      expect(isLikelyEncrypted("not-base64!!!")).toBe(false);
    });
  });

  describe("decryptOrRaw", () => {
    it("returns raw plaintext for unencrypted tokens", async () => {
      const plain = "3~BRtQx3h6VZMEHQ9E9kuXnye9Gv74tAKWT3NXfQTaeEXT6QM2Zc";
      const result = await decryptOrRaw(plain);
      expect(result).toBe(plain);
    });

    it("decrypts encrypted tokens", async () => {
      const plain = "3~sometokenthatworks";
      const ct = await encrypt(plain);
      const result = await decryptOrRaw(ct);
      expect(result).toBe(plain);
    });

    it("returns null if decryption fails (wrong key)", async () => {
      const plain = "3~sometokenthatworks";
      const ct = await encrypt(plain);
      mockEnv.ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAdiffkey!!";
      const result = await decryptOrRaw(ct);
      expect(result).toBeNull();
    });
  });
});
