"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDuePulseStore } from "@/lib/store";

export default function SyncNowButton({ userId }: { userId: string }) {
  const router = useRouter();
  const isSyncing = useDuePulseStore((s) => s.isSyncing);
  const setIsSyncing = useDuePulseStore((s) => s.setIsSyncing);

  async function handleSync() {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/canvas/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) });
      const data = (await res.json()) as { success?: boolean; error?: string; synced?: number };
      if (!res.ok) { toast.error(data.error ?? "Sync failed"); return; }
      toast.success(`Synced ${data.synced ?? 0} assignments`);
      router.refresh();
    } catch { toast.error("Network error — sync failed"); }
    finally { setIsSyncing(false); }
  }

  if (isSyncing) return <Skeleton className="h-9 w-24 rounded-xl bg-[#243044]" />;

  return (
    <Button onClick={handleSync} className="bg-[#6366F1] hover:bg-[#818CF8] text-white font-semibold text-sm rounded-xl shadow-[0_8px_25px_rgba(99,102,241,0.25)] h-9 px-4">
      Sync Now
    </Button>
  );
}
