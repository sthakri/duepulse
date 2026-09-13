import { describe, it, expect, vi, afterEach } from "vitest";
import { unsubscribePushDevice } from "@/lib/push";

/**
 * Sign-out must tear down the device's push subscription: without it the
 * nudge engine keeps sending to a logged-out user's phone.
 */

function makeStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    get length() {
      return m.size;
    },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

function stubBrowser({
  sub,
  storage = {},
}: {
  sub: { endpoint: string; unsubscribe: ReturnType<typeof vi.fn> } | null;
  storage?: Record<string, string>;
}) {
  const registration = {
    pushManager: { getSubscription: vi.fn(async () => sub) },
  };
  vi.stubGlobal("navigator", {
    serviceWorker: { getRegistration: vi.fn(async () => registration) },
  });
  vi.stubGlobal("sessionStorage", makeStorage(storage));
  const fetchMock = vi.fn(async () => ({ ok: true }));
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, storage: globalThis.sessionStorage as unknown as ReturnType<typeof makeStorage> };
}

afterEach(() => vi.unstubAllGlobals());

describe("unsubscribePushDevice", () => {
  it("deletes the server row, unsubscribes the browser, clears sync markers", async () => {
    const sub = { endpoint: "https://push.example/abc", unsubscribe: vi.fn(async () => true) };
    const { fetchMock } = stubBrowser({
      sub,
      storage: { "push-synced:u1": "https://push.example/abc", other: "keep" },
    });

    await unsubscribePushDevice();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push/subscribe",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ endpoint: "https://push.example/abc" }),
      }),
    );
    expect(sub.unsubscribe).toHaveBeenCalled();
    expect(sessionStorage.getItem("push-synced:u1")).toBeNull();
    expect(sessionStorage.getItem("other")).toBe("keep");
  });

  it("still clears sync markers when there is no subscription", async () => {
    const { fetchMock } = stubBrowser({ sub: null, storage: { "push-synced:u1": "x" } });

    await unsubscribePushDevice();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("push-synced:u1")).toBeNull();
  });

  it("never throws when everything fails (sign-out must proceed)", async () => {
    const sub = { endpoint: "https://push.example/abc", unsubscribe: vi.fn(async () => { throw new Error("sw dead"); }) };
    vi.stubGlobal("navigator", {
      serviceWorker: { getRegistration: vi.fn(async () => ({ pushManager: { getSubscription: vi.fn(async () => sub) } })) },
    });
    vi.stubGlobal("sessionStorage", makeStorage());
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));

    await expect(unsubscribePushDevice()).resolves.toBeUndefined();
    expect(sub.unsubscribe).toHaveBeenCalled();
  });
});
