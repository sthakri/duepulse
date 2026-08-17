"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const VISIBILITY_COOLDOWN_MS = 5 * 60 * 1000;

export default function AutoSync() {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    async function sync() {
      try {
        const res = await fetch("/api/canvas/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (res.ok) router.refresh();
      } catch {
        // Silent fail - don't bother the user
      }
    }

    function syncWithCooldown() {
      const now = Date.now();
      if (now - lastSyncRef.current >= VISIBILITY_COOLDOWN_MS) {
        lastSyncRef.current = now;
        sync();
      }
    }

    function startPolling() {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(sync, SYNC_INTERVAL_MS);
    }

    function stopPolling() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function handleVisibilityChange() {
      if (!document.hidden) {
        syncWithCooldown();
        startPolling();
      } else {
        stopPolling();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startPolling();
    lastSyncRef.current = Date.now();
    sync();

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
