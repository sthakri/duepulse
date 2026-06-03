"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDuePulseStore } from "@/lib/store";

interface Props {
  userId: string;
  token: string;
  domain: string;
}

export default function SyncNowButton({ userId, token, domain }: Props) {
  const router = useRouter();
  const isSyncing = useDuePulseStore((s) => s.isSyncing);
  const setIsSyncing = useDuePulseStore((s) => s.setIsSyncing);

  async function handleSync() {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/canvas/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, token, domain }),
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
    return <Skeleton className="h-9 w-28 rounded-md" />;
  }

  return (
    <Button
      onClick={handleSync}
      className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm"
    >
      Sync Now
    </Button>
  );
}
