"use client";

import { useState } from "react";

export default function TestNotifButton({ userId }: { userId: string }) {
  const [showWarning, setShowWarning] = useState(false);

  async function handleClick() {
    if (
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }
    setShowWarning(false);
    await fetch("/api/push/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-xl border border-[#2A3444] bg-[#151C2B] text-[#7E8AA0] hover:text-[#AAB4C4] hover:border-[#3A4454] text-xs px-3 py-1.5 transition-colors"
      >
        Test Notif
      </button>
      {showWarning && (
        <p className="absolute right-0 top-full mt-1.5 whitespace-nowrap rounded-xl bg-[#151C2B] border border-[#D6B36A]/25 px-3 py-2 text-[#D6B36A] text-xs shadow-lg z-50">
          Enable notifications first
        </p>
      )}
    </div>
  );
}
