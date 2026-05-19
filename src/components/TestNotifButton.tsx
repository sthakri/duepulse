'use client';

import { Button } from "@/components/ui/button";

export default function TestNotifButton({ userId }: { userId: string }) {
  async function handleClick() {
    await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  }

  return (
    <Button
      variant="outline"
      className="text-slate-400 border-slate-600 text-xs"
      onClick={handleClick}
    >
      Test Notif
    </Button>
  );
}
