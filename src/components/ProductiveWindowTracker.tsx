"use client";

import { useEffect } from "react";

export default function ProductiveWindowTracker({ userId, timezone }: { userId: string; timezone: string }) {
  useEffect(() => {
    let mounted = true;

    async function touch() {
      if (!mounted) return;
      try {
        await fetch("/api/productive-windows/touch", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch {
        // Silently fail - this is background telemetry
      }
    }

    // Touch on mount and then every 5 minutes while tab is visible
    touch();
    const interval = setInterval(touch, 5 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [userId, timezone]);

  return null;
}