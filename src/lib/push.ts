/**
 * Best-effort push teardown for sign-out. Deletes this device's server-side
 * subscription row (must run BEFORE signOut, while the session is still
 * valid) and unsubscribes the browser so the push service stops delivering.
 * Without this, Web Push keeps working after logout by protocol design and
 * the nudge engine keeps sending to the orphaned row.
 * Never throws: a push failure must not trap a user in their session.
 */
export async function unsubscribePushDevice(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.("/");
    const sub = await reg?.pushManager?.getSubscription?.();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    // Forget "this browser already synced" markers so a different account
    // signing in on this device doesn't skip its own subscription sync.
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith("push-synced:")) sessionStorage.removeItem(k);
    }
  } catch {
    // ponytail: best-effort only — a failed push cleanup must never block
    // sign-out; a leftover row dies on the next send via the 404/410 cleanup.
  }
}
