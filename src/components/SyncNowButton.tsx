"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDuePulseStore } from "@/lib/store";

interface Props {
  userId: string;
}

export default function SyncNowButton({ userId }: Props) {
  const router = useRouter();
  const isSyncing = useDuePulseStore((s) => s.isSyncing);
  const setIsSyncing = useDuePulseStore((s) => s.setIsSyncing);

  async function handleSync() {
    setIsSyncing(true);
    try {
      // No token/domain in the body — the secured API reads credentials from
      // the authenticated session and the user's profile row in the DB.
      const res = await fetch("/api/canvas/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        synced?: number;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Sync failed");
        return;
      }
      toast.success(`Synced ${data.synced ?? 0} assignments`);
      router.refresh();
    } catch {
      toast.error("Network error — sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  if (isSyncing) {
    return <Skeleton className="h-9 w-24 rounded-xl bg-[#1C2637]" />;
  }

  return (
    <Button
      onClick={handleSync}
      className="bg-[#D6B36A] hover:bg-[#E0BF78] text-[#0C111B] font-semibold text-sm rounded-xl shadow-none h-9 px-4"
    >
      Sync Now
    </Button>
  );
}
