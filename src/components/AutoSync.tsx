"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useDuePulseStore } from "@/lib/store";

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const VISIBILITY_COOLDOWN_MS = 5 * 60 * 1000;

export default function AutoSync() {
  const router = useRouter();
  const setTokenExpired = useDuePulseStore((s) => s.setTokenExpired);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSyncRef = useRef<number>(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    async function sync() {
      if (stoppedRef.current) return;
      try {
        const res = await fetch("/api/canvas/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (res.status === 401) {
          const data = (await res.json()) as { tokenExpired?: boolean };
          if (data.tokenExpired) {
            setTokenExpired(true);
            stopPolling();
            stoppedRef.current = true;
            console.log("[auto-sync] Canvas token expired — stopping auto-sync");
          }
          return;
        }
        if (res.ok) {
          setTokenExpired(false);
          router.refresh();
        }
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
        if (!stoppedRef.current) startPolling();
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
  }, [router, setTokenExpired]);

  return null;
}
