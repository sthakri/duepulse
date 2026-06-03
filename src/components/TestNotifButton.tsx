"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TestNotifButton({ userId }: { userId: string }) {
  const [showWarning, setShowWarning] = useState(false);

  async function handleClick() {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      setShowWarning(true);
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
      <Button
        variant="outline"
        className="text-slate-400 border-slate-600 text-xs"
        onClick={handleClick}
      >
        Test Notif
      </Button>
      {showWarning && (
        <p className="absolute right-0 top-full mt-1.5 whitespace-nowrap rounded-md bg-slate-800 border border-amber-400/30 px-2.5 py-1.5 text-amber-400 text-xs shadow-lg z-50">
          Enable notifications first
        </p>
      )}
    </div>
  );
}
