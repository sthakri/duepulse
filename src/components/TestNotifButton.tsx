"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function TestNotifButton() {
  const [showWarning, setShowWarning] = useState(false);

  async function getCurrentEndpoint(): Promise<string | null> {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return null;
      return sub.endpoint;
    } catch {
      return null;
    }
  }

  async function handleClick() {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }
    setShowWarning(false);

    const endpoint = await getCurrentEndpoint();
    if (!endpoint) {
      toast.error("No push subscription found — re-enable notifications");
      return;
    }

    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Test notification sent!");
      } else if (res.status === 410 || (res.status === 404 && data.expired)) {
        toast.error("Subscription expired — refresh the page and re-enable");
      } else {
        toast.error(data.error ?? "Test notification failed");
      }
    } catch {
      toast.error("Network error — could not send test notification");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-xl border border-[#334155] bg-[#1E293B] text-[#64748B] hover:text-[#94A3B8] hover:border-[#475569] text-xs px-3 py-1.5 transition-colors"
      >
        Test Notif
      </button>
      {showWarning && (
        <p className="absolute right-0 top-full mt-1.5 whitespace-nowrap rounded-xl bg-[#1E293B] border border-[#6366F1]/25 px-3 py-2 text-[#818CF8] text-xs shadow-lg z-50">
          Enable notifications first
        </p>
      )}
    </div>
  );
}