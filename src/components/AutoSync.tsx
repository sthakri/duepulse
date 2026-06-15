"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export default function AutoSync() {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        sync();
        startPolling();
      } else {
        stopPolling();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startPolling();
    sync();

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
